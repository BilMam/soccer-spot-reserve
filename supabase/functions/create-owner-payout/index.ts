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
      
      let { data: ownerDataResult } = await supabase
        .from('owners')
        .select('id, user_id')
        .eq('id', payout.owner_id)
        .single();

      // Fallback: si pas trouvé avec owners.id, essayer avec user_id (ancien schéma)
      if (!ownerDataResult) {
        console.log(`[${timestamp}] [doTransfer] Tentative fallback pour payout.owner_id=${payout.owner_id}`);
        const { data: ownerFallback } = await supabase
          .from('owners')
          .select('id, user_id')
          .eq('user_id', payout.owner_id) // ancien schéma
          .single();
        
        if (ownerFallback) {
          console.warn(`[${timestamp}] [doTransfer] Fallback réussi: trouvé owner avec user_id=${payout.owner_id}, owner.id=${ownerFallback.id}`);
          ownerDataResult = ownerFallback;
        }
      }

      // Second fallback: utiliser l'owner_id de la réservation
      if (!ownerDataResult && bookingData?.fields?.owner_id) {
        console.log(`[${timestamp}] [doTransfer] Second fallback via booking.fields.owner_id=${bookingData.fields.owner_id}`);
        const { data: ownerByBooking } = await supabase
          .from('owners')
          .select('id, user_id')
          .eq('user_id', bookingData.fields.owner_id)
          .single();
        
        if (ownerByBooking) {
          console.warn(`[${timestamp}] [doTransfer] Second fallback réussi: trouvé owner via booking avec user_id=${bookingData.fields.owner_id}, owner.id=${ownerByBooking.id}`);
          ownerDataResult = ownerByBooking;
        }
      }

      if (!ownerDataResult) {
        console.error(`[${timestamp}] [doTransfer] Owner introuvable pour payout.owner_id=${payout.owner_id} après tous les fallbacks`);
        
        // Marquer le payout comme bloqué
        await supabase
          .from('payouts')
          .update({
            status: 'blocked',
            error_message: 'Owner introuvable, payout bloqué',
            payout_attempted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', payout.id);

        return {
          success: false,
          message: 'Owner not found for payout',
          error_code: 'OWNER_NOT_FOUND'
        };
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
      
      try {
        // Sanitiser le numéro de téléphone
        const cleanedPhone = payoutAccountData.phone.replace(/^\+?225/, '').replace(/^0/, '');
        
        const { data: contactResponse, error: contactError } = await supabase.functions.invoke('create-owner-contact', {
          body: {
            owner_id: ownerData.id,
            owner_name: 'Proprietaire', // Sans accent pour éviter les problèmes d'encodage
            owner_surname: '',
            phone: cleanedPhone,
            email: `owner-${ownerData.id}@example.com`,
            country_prefix: '225'
          }
        });

        if (contactError) {
          console.error(`[${timestamp}] [doTransfer] Contact creation invoke error:`, contactError);
          
          // Fallback: vérifier si un contact existe déjà en base
          const { data: existingAccount } = await supabase
            .from('payment_accounts')
            .select('cinetpay_contact_added')
            .eq('owner_id', ownerData.id)
            .eq('payment_provider', 'cinetpay')
            .eq('account_type', 'contact')
            .maybeSingle();
          
          if (existingAccount?.cinetpay_contact_added) {
            console.warn(`[${timestamp}] [doTransfer] Contact already exists in DB, skipping creation`);
            contactId = payoutAccountData.cinetpay_contact_id;
          } else {
            throw new Error(`Erreur d'invocation: ${contactError.message}`);
          }
        }

        // Gérer les cas où le contact existe déjà
        if (!contactResponse?.success) {
          const errorMessage = contactResponse?.message || 'Erreur inconnue';
          
          // Si le contact existe déjà, considérer comme un succès
          if (errorMessage.includes('Contact déjà existant') || 
              errorMessage.includes('ERROR_PHONE_ALREADY_MY_CONTACT') ||
              contactResponse?.cinetpay_contact_id) {
            console.warn(`[${timestamp}] [doTransfer] Contact already exists, using existing ID`);
            contactId = contactResponse.cinetpay_contact_id;
          } else {
            console.error(`[${timestamp}] [doTransfer] Failed to create contact:`, contactResponse);
            
            // Marquer le payout comme échoué
            await supabase
              .from('payouts')
              .update({
                status: 'failed',
                error_message: 'CONTACT_CREATION_FAILED',
                payout_attempted_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', payout.id);

            return {
              success: false,
              message: errorMessage,
              error_code: 'CONTACT_CREATION_FAILED'
            };
          }
        } else {
          contactId = contactResponse.cinetpay_contact_id;
        }
        
        // Mettre à jour le contact_id en base si on en a un
        if (contactId) {
          await supabase
            .from('payout_accounts')
            .update({ cinetpay_contact_id: contactId })
            .eq('id', payoutAccountData.id);
        }
        
      } catch (error) {
        console.error(`[${timestamp}] [doTransfer] Contact creation failed:`, error);
        
        // Marquer le payout comme échoué
        await supabase
          .from('payouts')
          .update({
            status: 'failed',
            error_message: 'CONTACT_CREATION_FAILED',
            payout_attempted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', payout.id);

        return {
          success: false,
          message: error.message,
          error_code: 'CONTACT_CREATION_FAILED'
        };
      }
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