import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper function to add timeout to fetch requests
const fetchWithTimeout = async (url: string, options: any, timeoutMs = 15000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
};

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
    const cinetpayTransferLogin = Deno.env.get('CINETPAY_TRANSFER_LOGIN') || 'test_login';
    const cinetpayTransferPwd = Deno.env.get('CINETPAY_TRANSFER_PWD') || 'test_password';
    const isLocalTest = !Deno.env.get('CINETPAY_TRANSFER_LOGIN');

    console.log(`[${timestamp}] [create-owner-payout] Environment check:`, {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey,
      cinetpayTransferLogin: !!cinetpayTransferLogin,
      cinetpayTransferPwd: !!cinetpayTransferPwd,
      isLocalTest
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuration Supabase manquante');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let bookingRequest;
    try {
      bookingRequest = await req.json();
    } catch (jsonError) {
      console.error(`[${timestamp}] [create-owner-payout] Invalid JSON body:`, jsonError);
      throw new Error('Format de requête invalide');
    }
    const { booking_id }: PayoutRequest = bookingRequest;

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
      
      // 🔄 RETRY pour les statuts pending, waiting_funds, failed, blocked (for testing)
      if (['pending', 'waiting_funds', 'failed', 'blocked'].includes(existingPayout.status)) {
        console.log(`[${timestamp}] [create-owner-payout] Retrying transfer for existing payout: ${existingPayout.id}`);
        
        // Récupérer les données nécessaires pour le retry  
        const retryResult = await doTransfer(supabase, existingPayout, supabaseUrl, cinetpayTransferLogin, cinetpayTransferPwd, timestamp, { isLocalTest });
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
    
    if (!booking.fields?.owner_id) {
      throw new Error('Owner ID manquant dans la réservation');
    }

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
          ownerData,
          isLocalTest
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

    let payoutAccountData, booking, ownerData, isLocalTest = false;
    
    if (contextData) {
      // Données déjà récupérées lors de la création
      ({ payoutAccountData, booking, ownerData, isLocalTest } = contextData);
    } else {
      // Récupérer les données pour un retry
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('id, owner_amount, fields(id, name, owner_id)')
        .eq('id', payout.booking_id)
        .single();
      
      console.log(`[${timestamp}] [doTransfer] Fetching owner data for payout.owner_id: ${payout.owner_id}`);
      let { data: ownerDataResult, error: ownerError } = await supabase
        .from('owners')
        .select('id, user_id')
        .eq('id', payout.owner_id)
        .single();
        
      if (ownerError) {
        console.error(`[${timestamp}] [doTransfer] Owner query error:`, ownerError);
      }
      console.log(`[${timestamp}] [doTransfer] Owner query result:`, ownerDataResult);

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

      console.log(`[${timestamp}] [doTransfer] Fetching payout account for owner_id: ${ownerDataResult.id}`);
      const { data: accountData, error: accountError } = await supabase
        .from('payout_accounts')
        .select('id, phone, cinetpay_contact_id, is_active')
        .eq('owner_id', ownerDataResult.id)
        .eq('is_active', true)
        .single();
        
      if (accountError) {
        console.error(`[${timestamp}] [doTransfer] Payout account query error:`, accountError);
      }
      console.log(`[${timestamp}] [doTransfer] Payout account data:`, accountData);

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
        // Sanitiser le numéro de téléphone - retire +225 et le 0 initial
        const cleanedPhone = payoutAccountData.phone
          .replace(/^\+?225/, '')   // AUCUN espace - retire +225
          .replace(/^0+/, '');      // retire un ou plusieurs 0 initiaux
        
        console.log(`[${timestamp}] [doTransfer] DEBUG Phone cleaning:`, { 
          original: payoutAccountData.phone, 
          cleaned: cleanedPhone 
        });
        
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
          
          // Marquer le payout comme failed (pas blocked) pour permettre un retry
          await supabase
            .from('payouts')
            .update({
              status: 'failed',
              error_message: 'Contact creation error: ' + contactError.message,
              payout_attempted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', payout.id);

          return {
            success: false,
            message: contactError.message,
            error_code: 'CONTACT_CREATION_FAILED'
          };
        }

        // Traiter la réponse de création de contact
        if (!contactResponse?.success) {
          const errorMsg = contactResponse?.message || 'Unknown contact creation error';
          console.error(`[${timestamp}] [doTransfer] Failed to create contact:`, contactResponse);
          
          // Si c'est une erreur de format (422), marquer blocked, sinon failed pour retry
          const shouldBlock = contactResponse?.status === 422;
          
          await supabase
            .from('payouts')
            .update({
              status: shouldBlock ? 'blocked' : 'failed',
              error_message: errorMsg,
              payout_attempted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', payout.id);

          return {
            success: false,
            message: errorMsg,
            error_code: 'CONTACT_CREATION_FAILED'
          };
        }
        
        contactId = contactResponse.contact_id;
        
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

    // Authentification CinetPay Transfer API (avec mode test local)
    console.log(`[${timestamp}] [doTransfer] Starting CinetPay auth`, {
      login: cinetpayTransferLogin?.slice(0, 4) + '***',
      endpoint: 'https://api-money-transfer.cinetpay.com/v2/auth/login',
      isLocalTest
    });
    
    let accessToken = 'test_token';
    
    if (isLocalTest) {
      console.log(`[${timestamp}] [doTransfer] Local test mode - simulating CinetPay auth`);
      // Simuler une authentification réussie pour les tests locaux
    } else {
      const authResponse = await fetchWithTimeout('https://api-money-transfer.cinetpay.com/v2/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: cinetpayTransferLogin,
          password: cinetpayTransferPwd
        })
      });

      if (!authResponse.ok) {
        console.error(`[${timestamp}] [doTransfer] CinetPay auth HTTP error:`, authResponse.status);
        throw new Error(`CinetPay auth failed with status: ${authResponse.status}`);
      }
      
      const authData = await authResponse.json();
      if (!authData.success) {
        console.error(`[${timestamp}] [doTransfer] CinetPay auth failed:`, authData);
        throw new Error('Échec de l\'authentification CinetPay');
      }

      accessToken = authData.access_token;
    }
    
    console.log(`[${timestamp}] [doTransfer] CinetPay authenticated successfully`);

    // Effectuer le transfert
    const transferData = {
      amount: Math.round(payout.amount_net || payout.amount),
      client_transaction_id: payout.id,
      contact_id: contactId,
      currency: 'XOF',
      description: `Payout MySport - ${booking.fields?.name || 'Terrain'}`,
      notify_url: `${supabaseUrl}/functions/v1/cinetpay-transfer-webhook`
    };

    console.log(`[${timestamp}] [doTransfer] CINETPAY_RAW_REQUEST:`, transferData);
    console.log(`[${timestamp}] [doTransfer] Initiating transfer:`, transferData);

    let transferResult;
    let transferResponseStatus = 200;
    
    if (isLocalTest) {
      console.log(`[${timestamp}] [doTransfer] Local test mode - simulating successful transfer`);
      // Simuler un transfert réussi pour les tests locaux
      transferResult = {
        code: '00',
        success: true,
        message: 'Transfer completed successfully (simulation)',
        transaction_id: `test_transfer_${payout.id}`,
        amount: Math.round(payout.amount_net || payout.amount)
      };
      
      console.log(`[${timestamp}] [doTransfer] CINETPAY_RAW:`, { 
        status: transferResponseStatus, 
        transferResult,
        isSimulated: true
      });
    } else {
      const transferResponse = await fetchWithTimeout('https://api-money-transfer.cinetpay.com/v2/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(transferData)
      });

      transferResponseStatus = transferResponse.status;
      transferResult = await transferResponse.json();
      console.log(`[${timestamp}] [doTransfer] CINETPAY_RAW:`, { 
        status: transferResponseStatus, 
        transferResult 
      });
    }
    
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
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({ 
          payout_sent: true
        })
        .eq('id', payout.booking_id);
      
      if (bookingUpdateError) {
        console.error(`[${timestamp}] [doTransfer] Failed to update booking:`, bookingUpdateError);
      } else {
        console.log(`[${timestamp}] [doTransfer] Booking marked as payout_sent = true`);
      }
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