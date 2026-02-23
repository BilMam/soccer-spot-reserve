import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAYDUNYA_API_BASE = 'https://app.paydunya.com/api/v2';

/**
 * Détecte le provider mobile money basé sur le préfixe du numéro de téléphone (Côte d'Ivoire)
 */
function detectWithdrawMode(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  let prefix = '';
  if (cleaned.startsWith('+225')) {
    prefix = cleaned.substring(4, 6);
  } else if (cleaned.startsWith('225')) {
    prefix = cleaned.substring(3, 5);
  } else if (cleaned.startsWith('00225')) {
    prefix = cleaned.substring(5, 7);
  } else {
    prefix = cleaned.substring(0, 2);
  }
  
  console.log(`[detectWithdrawMode] Numéro: ${phoneNumber}, Préfixe: ${prefix}`);
  
  if (prefix === '07' || prefix === '70') {
    return 'wave-ci';
  } else if (prefix === '08' || prefix === '09' || prefix === '17' || prefix === '47' || prefix === '57' || prefix === '67' || prefix === '77' || prefix === '87' || prefix === '97') {
    return 'orange-money-ci';
  } else if (prefix === '05' || prefix === '06' || prefix === '15' || prefix === '25' || prefix === '45' || prefix === '55' || prefix === '65' || prefix === '75' || prefix === '85' || prefix === '95') {
    return 'mtn-ci';
  } else if (prefix === '01' || prefix === '02' || prefix === '03') {
    return 'moov-ci';
  }
  
  console.warn(`[detectWithdrawMode] ⚠️ Préfixe inconnu: ${prefix}, utilisation de Orange Money par défaut`);
  return 'orange-money-ci';
}

interface PayoutRequest {
  booking_id: string;
}

interface PayoutResponse {
  success: boolean;
  message: string;
  payout_id?: string;
  amount?: number;
  paydunya_transfer_id?: string;
}

// Helper function with timeout
const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
};

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [create-paydunya-payout] Function started`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const paydunyaMasterKey = Deno.env.get('PAYDUNYA_MASTER_KEY');
    const paydunyaPrivateKey = Deno.env.get('PAYDUNYA_PRIVATE_KEY');
    const paydunyaToken = Deno.env.get('PAYDUNYA_TOKEN');
    const paydunyaMode = Deno.env.get('PAYDUNYA_MODE') || 'test';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Test mode if PayDunya credentials are missing
    const isTestMode = !paydunyaMasterKey || !paydunyaPrivateKey || !paydunyaToken;
    if (isTestMode) {
      console.log(`[${timestamp}] ⚠️ TEST MODE: PayDunya credentials missing - will simulate transfers`);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request
    const { booking_id }: PayoutRequest = await req.json();
    console.log(`[${timestamp}] Processing PayDunya payout for booking: ${booking_id}`);

    // Step 1: Get booking with payout account info
    // Accepter 'paid' ET 'deposit_paid' comme statuts valides
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        owner_amount,
        payment_status,
        payout_sent,
        payment_type,
        deposit_amount,
        fields!inner (
          id,
          name,
          payout_account_id,
          payout_accounts (
            id,
            phone,
            is_active,
            owner_id
          )
        )
      `)
      .eq('id', booking_id)
      .in('payment_status', ['paid', 'deposit_paid'])
      .maybeSingle();

    if (bookingError || !bookingData) {
      throw new Error(`Booking not found or not paid: ${bookingError?.message}`);
    }

    // Access payout_accounts from the nested fields object
    const fieldsData = bookingData.fields as { id: string; name: string; payout_account_id: string; payout_accounts: { id: string; phone: string; is_active: boolean; owner_id: string } | null };
    const payoutAccount = fieldsData?.payout_accounts;
    const ownerPhone = payoutAccount?.phone;

    if (!ownerPhone) {
      throw new Error('Aucun compte de paiement configuré pour ce terrain. Le propriétaire doit configurer son numéro Mobile Money.');
    }

    if (!payoutAccount.is_active) {
      throw new Error('Le compte de paiement est inactif. Le propriétaire doit activer son compte.');
    }

    console.log(`[${timestamp}] Payout account found - Phone: ${ownerPhone}, Owner: ${payoutAccount.owner_id}`);

    // Déterminer le montant du payout selon le type de paiement
    const isDeposit = bookingData.payment_type === 'deposit';
    const payoutAmount = isDeposit
      ? (bookingData.deposit_amount || bookingData.owner_amount)
      : bookingData.owner_amount;

    console.log(`[${timestamp}] Payout mode: ${isDeposit ? 'GARANTIE (acompte partiel)' : 'PLEIN'}, Amount: ${payoutAmount} XOF`);

    // Step 2: Check for existing payout (idempotency robuste)
    const { data: existingPayout } = await supabase
      .from('payouts')
      .select('id, status, amount_net, paydunya_transfer_id')
      .eq('booking_id', booking_id)
      .maybeSingle();

    if (existingPayout) {
      // ✅ Vérifier TOUS les cas où le payout est déjà traité
      if (existingPayout.status === 'completed' || 
          existingPayout.status === 'processing' ||
          existingPayout.paydunya_transfer_id !== null) {
        
        console.log(`[${timestamp}] 🛑 Payout already processed - Status: ${existingPayout.status}, Transfer: ${existingPayout.paydunya_transfer_id}`);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: `Payout already ${existingPayout.status}`,
            payout_id: existingPayout.id,
            amount: existingPayout.amount_net,
            paydunya_transfer_id: existingPayout.paydunya_transfer_id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // ✅ Seulement si status = 'pending' ET pas de transfer_id, on continue
      console.log(`[${timestamp}] Retrying pending payout: ${existingPayout.id}`);
    }

    // Step 3: Create or update payout record
    let payoutId = existingPayout?.id;
    
    if (!existingPayout) {
      const { data: newPayout, error: payoutError } = await supabase
        .from('payouts')
        .insert({
          booking_id: booking_id,
          owner_id: payoutAccount.owner_id,
          amount: payoutAmount,
          amount_net: payoutAmount,
          status: 'pending',
          platform_fee_owner: 0
        })
        .select('id')
        .single();

      if (payoutError) {
        throw new Error(`Failed to create payout: ${payoutError.message}`);
      }

      payoutId = newPayout.id;
      console.log(`[${timestamp}] Payout created: ${payoutId}`);
    }

    // Step 4: Execute transfer via PayDunya Direct Pay v2 (same API as refunds)
    let transferResult: { success: boolean; response_code?: string; response_text?: string; transaction_id?: string; amount?: number };
    let transferId: string | undefined;

    if (isTestMode) {
      // Simulate successful transfer
      transferResult = {
        response_code: '00',
        success: true,
        response_text: 'Transfer completed successfully (test mode)',
        transaction_id: `test_paydunya_transfer_${payoutId}`,
        amount: payoutAmount
      };
      transferId = transferResult.transaction_id;

      console.log(`[${timestamp}] ⚠️ TEST MODE: Simulated PayDunya transfer of ${payoutAmount} XOF${isDeposit ? ' (acompte garantie)' : ''}`);
    } else {
      // Real PayDunya Direct Pay v2 transfer
      try {
        // Normaliser le numéro (enlever +225, 225, 00225 et espaces)
        let normalizedPhone = ownerPhone.replace(/^\+225|^225|^00225/, '').replace(/\s/g, '');
        
        // Ajouter le 0 initial si manquant (numéro à 9 chiffres)
        if (/^\d{9}$/.test(normalizedPhone)) {
          normalizedPhone = '0' + normalizedPhone;
          console.log(`[${timestamp}] 🔧 Ajout du 0 initial: ${normalizedPhone}`);
        }

        // Valider le format (10 chiffres commençant par 0)
        if (!/^0\d{9}$/.test(normalizedPhone)) {
          throw new Error(`Format de téléphone invalide: ${ownerPhone}. Le numéro doit être au format ivoirien (ex: 0708090001)`);
        }

        // Détecter automatiquement le provider mobile money
        const withdrawMode = detectWithdrawMode(normalizedPhone);
        console.log(`[${timestamp}] 📱 Provider détecté: ${withdrawMode}`);

        // ÉTAPE 1 : Créer l'invoice de déboursement
        console.log(`[${timestamp}] 💸 Création invoice déboursement: ${payoutAmount} XOF vers ${normalizedPhone}${isDeposit ? ' (acompte garantie)' : ''}`);

        const getInvoicePayload = {
          account_alias: normalizedPhone,
          amount: Math.round(payoutAmount),
          withdraw_mode: withdrawMode,
          callback_url: `${supabaseUrl}/functions/v1/paydunya-ipn`
        };

        const getInvoiceResponse = await fetchWithTimeout(
          `${PAYDUNYA_API_BASE}/disburse/get-invoice`,
          {
            method: 'POST',
            headers: {
              'PAYDUNYA-MASTER-KEY': paydunyaMasterKey!,
              'PAYDUNYA-PRIVATE-KEY': paydunyaPrivateKey!,
              'PAYDUNYA-TOKEN': paydunyaToken!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(getInvoicePayload),
          }
        );

        if (!getInvoiceResponse.ok) {
          const errorText = await getInvoiceResponse.text();
          throw new Error(`Erreur création invoice: ${getInvoiceResponse.status} - ${errorText}`);
        }

        const disburseInvoiceData = await getInvoiceResponse.json();
        console.log(`[${timestamp}] 📄 Réponse invoice:`, disburseInvoiceData);

        if (disburseInvoiceData.response_code !== '00') {
          throw new Error(`Erreur invoice: ${disburseInvoiceData.response_text || 'Code: ' + disburseInvoiceData.response_code}`);
        }

        const disburseToken = disburseInvoiceData.disburse_token;
        if (!disburseToken) {
          throw new Error('disburse_token manquant dans la réponse PayDunya');
        }

        console.log(`[${timestamp}] ✅ Invoice créée: ${disburseToken}`);

        // ÉTAPE 2 : Soumettre l'invoice pour exécution
        console.log(`[${timestamp}] 📤 Soumission déboursement...`);
        
        const disburseId = `payout_${payoutId}_${Date.now()}`;
        
        const submitPayload = {
          disburse_invoice: disburseToken,
          disburse_id: disburseId
        };

        const submitResponse = await fetchWithTimeout(
          `${PAYDUNYA_API_BASE}/disburse/submit-invoice`,
          {
            method: 'POST',
            headers: {
              'PAYDUNYA-MASTER-KEY': paydunyaMasterKey!,
              'PAYDUNYA-PRIVATE-KEY': paydunyaPrivateKey!,
              'PAYDUNYA-TOKEN': paydunyaToken!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(submitPayload),
          }
        );

        if (!submitResponse.ok) {
          const errorText = await submitResponse.text();
          throw new Error(`Erreur soumission: ${submitResponse.status} - ${errorText}`);
        }

        const disbursementData = await submitResponse.json();
        console.log(`[${timestamp}] ✅ Déboursement soumis:`, disbursementData);

        if (disbursementData.response_code !== '00') {
          throw new Error(`Erreur déboursement: ${disbursementData.response_text || 'Code: ' + disbursementData.response_code}`);
        }

        transferId = disbursementData.transaction_id;
        
        if (!transferId) {
          throw new Error('transaction_id manquant dans la réponse PayDunya');
        }

        // Vérifier le statut
        const payStatus = (
          disbursementData.status || 
          disbursementData.state || 
          disbursementData.disbursement_status || 
          ''
        ).toLowerCase();
        
        const respCode = disbursementData.response_code || disbursementData['response_code'];

        transferResult = {
          success: respCode === '00' || ['completed', 'success', 'succeeded', 'successful', 'paid'].includes(payStatus),
          response_code: respCode,
          response_text: disbursementData.response_text || `Payout ${payStatus}`,
          transaction_id: transferId,
          amount: payoutAmount
        };

        console.log(`[${timestamp}] PayDunya Direct Pay v2 response:`, transferResult);
      } catch (error) {
        console.error(`[${timestamp}] PayDunya transfer failed:`, error);
        transferResult = {
          success: false,
          response_text: error instanceof Error ? error.message : String(error),
          response_code: 'ERROR'
        };
      }
    }

    // Step 5: Update payout status
    const newStatus = transferResult.success && transferResult.response_code === '00' ? 'completed' : 'failed';
    const shouldMarkBookingSent = newStatus === 'completed';

    const { error: updatePayoutError } = await supabase
      .from('payouts')
      .update({
        status: newStatus,
        transfer_response: transferResult,
        paydunya_transfer_id: transferId,
        updated_at: new Date().toISOString()
      })
      .eq('id', payoutId);

    if (updatePayoutError) {
      console.error(`[${timestamp}] Failed to update payout:`, updatePayoutError);
    }

    // Step 6: Mark booking as payout sent if successful
    if (shouldMarkBookingSent) {
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({ payout_sent: true })
        .eq('id', booking_id);

      if (bookingUpdateError) {
        console.error(`[${timestamp}] Failed to update booking:`, bookingUpdateError);
      } else {
        console.log(`[${timestamp}] ✅ PayDunya payout completed successfully`);
      }
    }

    // Return response
    const response: PayoutResponse = {
      success: transferResult.success,
      message: transferResult.response_text || `Payout ${newStatus}${isDeposit ? ' (acompte garantie)' : ''}`,
      payout_id: payoutId,
      amount: payoutAmount,
      paydunya_transfer_id: transferId
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error(`[${timestamp}] Error:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : String(error),
        timestamp 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
