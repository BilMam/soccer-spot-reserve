import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PayoutRequest {
  booking_id: string;
}

interface PayoutResponse {
  success: boolean;
  message: string;
  payout_id?: string;
  amount?: number;
  cinetpay_transfer_id?: string;
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [create-owner-payout] Function started`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const cinetpayTransferLogin = Deno.env.get('CINETPAY_TRANSFER_LOGIN');
    const cinetpayTransferPwd = Deno.env.get('CINETPAY_TRANSFER_PWD');

    if (!supabaseUrl || !supabaseServiceKey || !cinetpayTransferLogin || !cinetpayTransferPwd) {
      throw new Error('Configuration manquante');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { booking_id }: PayoutRequest = await req.json();

    console.log(`[${timestamp}] [create-owner-payout] Processing booking:`, booking_id);

    // Idempotence: vérifier si un payout existe déjà
    const { data: existingPayout } = await supabase
      .from('payouts')
      .select('id, status, amount_net, booking_id, owner_id')
      .eq('booking_id', booking_id)
      .maybeSingle();

    if (existingPayout) {
      console.log(`[${timestamp}] [create-owner-payout] Payout already exists:`, existingPayout);
      
      // Si déjà complété, pas besoin de retenter
      if (existingPayout.status === 'completed') {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Payout already completed',
            payout_id: existingPayout.id,
            amount: existingPayout.amount_net
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
      
      // 🔄 RETRY pour les statuts pending, waiting_funds, failed
      if (['pending', 'waiting_funds', 'failed'].includes(existingPayout.status)) {
        console.log(`[${timestamp}] [create-owner-payout] Retrying transfer for existing payout: ${existingPayout.id}`);
        
        // Récupérer les données nécessaires pour le retry
        const retryResult = await doTransfer(supabase, existingPayout, supabaseUrl, cinetpayTransferLogin, cinetpayTransferPwd, timestamp);
        return new Response(
          JSON.stringify({
            success: retryResult.success,
            message: retryResult.message,
            payout_id: existingPayout.id,
            amount: existingPayout.amount_net,
            retry: true
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
    }

    // Étape 1 : Récupérer booking + field (retirer le filtre payout_sent pour éviter les erreurs de retry)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        owner_amount,
        field_price,
        platform_fee_owner,
        total_price,
        payment_status,
        payout_sent,
        fields (
          id,
          name,
          owner_id
        )
      `)
      .eq('id', booking_id)
      .eq('payment_status', 'paid')
      .single();

    if (bookingError || !booking) {
      console.error(`[${timestamp}] [create-owner-payout] Booking not found or not eligible:`, bookingError);
      throw new Error('Réservation non trouvée ou non éligible au payout');
    }

    console.log(`[${timestamp}] [create-owner-payout] Booking found:`, {
      id: booking.id,
      owner_amount: booking.owner_amount,
      field_owner_id: booking.fields.owner_id
    });

    // Étape 2 : Récupérer owner avec requête séparée pour éviter les jointures complexes
    const { data: ownerData, error: ownerError } = await supabase
      .from('owners')
      .select('id, user_id')
      .eq('user_id', booking.fields.owner_id)
      .single();

    if (ownerError || !ownerData) {
      console.error(`[${timestamp}] [create-owner-payout] Owner not found:`, ownerError);
      throw new Error('Propriétaire non trouvé');
    }

    // Étape 3 : Récupérer le payout_account actif 
    const { data: payoutAccountData, error: payoutAccountError } = await supabase
      .from('payout_accounts')
      .select('id, phone, cinetpay_contact_id, is_active')
      .eq('owner_id', ownerData.id)
      .eq('is_active', true)
      .single();

    if (payoutAccountError || !payoutAccountData) {
      console.error(`[${timestamp}] [create-owner-payout] Active payout account not found:`, payoutAccountError);
      throw new Error('Compte de paiement actif non trouvé');
    }

    // Validation des données critiques
    if (!payoutAccountData.phone) {
      throw new Error('Numéro de téléphone manquant pour le compte de paiement');
    }

    console.log(`[${timestamp}] [create-owner-payout] Owner data found:`, {
      owner_id: ownerData.id,
      phone: payoutAccountData.phone,
      has_contact_id: !!payoutAccountData.cinetpay_contact_id
    });

    // Créer le payout s'il n'existe pas (cas nouveau)
    if (!existingPayout) {
      const { data: newPayout, error: payoutError } = await supabase
        .from('payouts')
        .insert({
          booking_id: booking_id,
          owner_id: ownerData.id,
          amount: booking.owner_amount,
          amount_net: booking.owner_amount,
          platform_fee_owner: booking.platform_fee_owner || 0,
          status: 'pending'
        })
        .select()
        .single();

      if (payoutError) {
        console.error(`[${timestamp}] [create-owner-payout] Failed to create payout:`, payoutError);
        throw new Error('Erreur lors de la création du payout');
      }

      console.log(`[${timestamp}] [create-owner-payout] Payout created:`, { id: newPayout.id });
      
      // Exécuter le transfert avec le nouveau payout
      const transferResult = await doTransfer(
        supabase, 
        { ...newPayout, booking_id, owner_id: ownerData.id }, 
        supabaseUrl, 
        cinetpayTransferLogin, 
        cinetpayTransferPwd, 
        timestamp,
        {
          payoutAccountData,
          booking,
          ownerData
        }
      );

      return new Response(
        JSON.stringify({
          success: transferResult.success,
          message: transferResult.message,
          payout_id: newPayout.id,
          amount: booking.owner_amount,
          transfer_response: transferResult.transferResult
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Cas inattendu - payout existe mais pas traité',
        payout_id: existingPayout?.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );

  } catch (error) {
    console.error(`[${timestamp}] [create-owner-payout] Error:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message,
        timestamp 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Fonction séparée pour effectuer le transfert
async function doTransfer(
  supabase: any, 
  payout: any, 
  supabaseUrl: string, 
  cinetpayTransferLogin: string, 
  cinetpayTransferPwd: string, 
  timestamp: string,
  contextData?: any
) {
  try {
    console.log(`[${timestamp}] [doTransfer] Starting transfer for payout: ${payout.id}`);

    let payoutAccountData, booking, ownerData;
    
    if (contextData) {
      // Données déjà récupérées lors de la création
      ({ payoutAccountData, booking, ownerData } = contextData);
    } else {
      // Récupérer les données pour un retry
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('id, owner_amount, fields(id, name, owner_id)')
        .eq('id', payout.booking_id)
        .single();
      
      const { data: ownerDataResult } = await supabase
        .from('owners')
        .select('id, user_id')
        .eq('id', payout.owner_id)
        .single();

      if (!ownerDataResult) {
        throw new Error(`Owner row not found for owner_id ${payout.owner_id}`);
      }

      const { data: accountData } = await supabase
        .from('payout_accounts')
        .select('id, phone, cinetpay_contact_id, is_active')
        .eq('owner_id', ownerDataResult.id)
        .eq('is_active', true)
        .single();

      booking = bookingData;
      payoutAccountData = accountData;
      ownerData = ownerDataResult;
    }

    // Vérifier que le compte de payout existe
    if (!payoutAccountData) {
      console.error(`[${timestamp}] [doTransfer] No payout account found for owner: ${payout.owner_id}`);
      
      // Marquer le payout comme bloqué
      await supabase
        .from('payouts')
        .update({
          status: 'blocked',
          error_message: 'Aucun compte de payout trouvé pour ce propriétaire',
          payout_attempted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', payout.id);

      return {
        success: false,
        message: 'Aucun compte de payout trouvé pour ce propriétaire',
        error_code: 'NO_PAYOUT_ACCOUNT'
      };
    }

    // Fallback : créer un contact CinetPay s'il manque
    let contactId = payoutAccountData.cinetpay_contact_id;
    if (!contactId) {
      console.log(`[${timestamp}] [doTransfer] Creating CinetPay contact for owner`);
      
      const { data: contactResponse, error: contactError } = await supabase.functions.invoke('create-owner-contact', {
        body: {
          owner_id: ownerData.user_id,
          owner_name: 'Propriétaire',
          phone: payoutAccountData.phone.replace(/^\+?225/, ''),
          email: `owner-${ownerData.user_id}@example.com`,
          country_prefix: '225'
        }
      });

      if (contactError || !contactResponse?.success) {
        console.error(`[${timestamp}] [doTransfer] Failed to create contact:`, contactError);
        throw new Error('Erreur lors de la création du contact CinetPay');
      }

      contactId = contactResponse.cinetpay_contact_id;
      
      await supabase
        .from('payout_accounts')
        .update({ cinetpay_contact_id: contactId })
        .eq('id', payoutAccountData.id);
    }

    // Authentification CinetPay Transfer API
    const authResponse = await fetch('https://api-money-transfer.cinetpay.com/v2/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: cinetpayTransferLogin,
        password: cinetpayTransferPwd
      })
    });

    const authData = await authResponse.json();
    if (!authData.success) {
      console.error(`[${timestamp}] [doTransfer] CinetPay auth failed:`, authData);
      throw new Error('Échec de l\'authentification CinetPay');
    }

    const accessToken = authData.access_token;
    console.log(`[${timestamp}] [doTransfer] CinetPay authenticated successfully`);

    // Effectuer le transfert
    const transferData = {
      amount: Math.round(payout.amount_net || payout.amount),
      client_transaction_id: payout.id,
      contact_id: contactId,
      currency: 'XOF',
      description: `Payout MySport - ${booking.fields.name}`,
      notify_url: `${supabaseUrl}/functions/v1/cinetpay-transfer-webhook`
    };

    console.log(`[${timestamp}] [doTransfer] Initiating transfer:`, transferData);

    const transferResponse = await fetch('https://api-money-transfer.cinetpay.com/v2/transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(transferData)
    });

    const transferResult = await transferResponse.json();
    console.log(`[${timestamp}] [doTransfer] Transfer API response:`, transferResult);

    // Déterminer le statut basé sur la réponse
    let newStatus = 'pending';
    let shouldMarkBookingAsSent = false;

    if (transferResult.code === '00' && transferResult.success) {
      newStatus = 'completed';
      shouldMarkBookingAsSent = true;
      console.log(`[${timestamp}] [doTransfer] Transfer completed successfully!`);
    } else if (transferResult.code === '603') {
      newStatus = 'waiting_funds';
    } else {
      newStatus = 'failed';
    }

    // Mettre à jour le payout avec la réponse + timestamp de tentative
    const { error: updateError } = await supabase
      .from('payouts')
      .update({
        status: newStatus,
        transfer_response: transferResult,
        cinetpay_transfer_id: transferResult.transaction_id || null,
        payout_attempted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', payout.id);

    if (updateError) {
      console.error(`[${timestamp}] [doTransfer] Failed to update payout:`, updateError);
    }

    // ✅ Marquer le booking comme traité SEULEMENT si le transfert est réussi
    if (shouldMarkBookingAsSent) {
      await supabase
        .from('bookings')
        .update({ 
          payout_sent: true,
          cinetpay_transfer_id: transferResult.transaction_id || null
        })
        .eq('id', payout.booking_id);
      
      console.log(`[${timestamp}] [doTransfer] Booking marked as payout_sent = true`);
    }

    console.log(`[${timestamp}] [doTransfer] Transfer process completed:`, {
      payout_id: payout.id,
      status: newStatus,
      amount: payout.amount_net || payout.amount,
      booking_marked: shouldMarkBookingAsSent
    });

    return {
      success: transferResult.success || newStatus === 'waiting_funds',
      message: transferResult.message || `Payout ${newStatus}`,
      transferResult
    };

  } catch (error) {
    console.error(`[${timestamp}] [doTransfer] Error:`, error);
    
    // Marquer comme failed en cas d'erreur + timestamp
    await supabase
      .from('payouts')
      .update({
        status: 'failed',
        payout_attempted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', payout.id);

    return {
      success: false,
      message: error.message,
      transferResult: null
    };
  }
}