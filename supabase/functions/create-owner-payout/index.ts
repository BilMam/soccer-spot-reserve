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
  provider_transfer_id?: string;
  payment_provider?: string;
}

// Helper function with timeout
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

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [create-owner-payout] Function started`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const cinetpayTransferLogin = Deno.env.get('CINETPAY_TRANSFER_LOGIN');
    const cinetpayTransferPwd = Deno.env.get('CINETPAY_TRANSFER_PWD');
    const paydunya_master_key = Deno.env.get('PAYDUNYA_MASTER_KEY');
    const paydunya_private_key = Deno.env.get('PAYDUNYA_PRIVATE_KEY');
    const paydunya_token = Deno.env.get('PAYDUNYA_TOKEN');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request
    const { booking_id }: PayoutRequest = await req.json();
    console.log(`[${timestamp}] Processing payout for booking: ${booking_id}`);

    // Step 1: Get booking with owner info (single query)
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        owner_amount,
        payment_status,
        payment_provider,
        payout_sent,
        fields!inner (
          id,
          name,
          owner_id,
          owners!inner (
            id,
            phone,
            mobile_money,
            cinetpay_contact_id
          )
        )
      `)
      .eq('id', booking_id)
      .eq('payment_status', 'paid')
      .single();

    if (bookingError || !bookingData) {
      throw new Error(`Booking not found or not paid: ${bookingError?.message}`);
    }

    const owner = bookingData.fields.owners;
    const paymentProvider = bookingData.payment_provider || 'cinetpay'; // Default to cinetpay for backward compatibility
    console.log(`[${timestamp}] Found owner: ${owner.id}, phone: ${owner.phone}, payment_provider: ${paymentProvider}`);

    // Step 2: Check for existing payout (idempotency)
    const { data: existingPayout } = await supabase
      .from('payouts')
      .select('id, status, amount_net')
      .eq('booking_id', booking_id)
      .maybeSingle();

    if (existingPayout) {
      if (existingPayout.status === 'completed') {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Payout already completed',
            payout_id: existingPayout.id,
            amount: existingPayout.amount_net
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Retry failed/pending payouts
      console.log(`[${timestamp}] Retrying existing payout: ${existingPayout.id}`);
    }

    // Step 3: Validate provider-specific contact info
    if (paymentProvider === 'paydunya') {
      if (!owner.mobile_money) {
        throw new Error(`Owner ${owner.id} has no mobile money number for PayDunya transfers.`);
      }
      console.log(`[${timestamp}] Using PayDunya with mobile_money: ${owner.mobile_money}`);
    } else {
      // CinetPay validation
      const contactId = owner.cinetpay_contact_id;
      if (!contactId) {
        throw new Error(`Owner ${owner.id} has no CinetPay contact. Owner must be registered through signup flow.`);
      }
      console.log(`[${timestamp}] [refactor] contact creation logic removed – using existing contact_id only: ${contactId}`);
    }

    // Step 4: Create or update payout record
    let payoutId = existingPayout?.id;
    
    if (!existingPayout) {
      const { data: newPayout, error: payoutError } = await supabase
        .from('payouts')
        .insert({
          booking_id: booking_id,
          owner_id: owner.id,
          amount: bookingData.owner_amount,
          amount_net: bookingData.owner_amount,
          status: 'pending'
        })
        .select('id')
        .single();

      if (payoutError) {
        throw new Error(`Failed to create payout: ${payoutError.message}`);
      }

      payoutId = newPayout.id;
      console.log(`[${timestamp}] Payout created: ${payoutId}`);
    }

    // Step 5: Execute transfer based on payment provider
    let transferResult;
    let transferId;

    if (paymentProvider === 'paydunya') {
      // PayDunya Transfer
      const isPayDunyaTestMode = !paydunya_master_key || !paydunya_private_key || !paydunya_token;
      
      if (isPayDunyaTestMode) {
        // Simulate successful PayDunya transfer
        transferResult = {
          response_code: '00',
          success: true,
          response_text: 'Transfer completed successfully (PayDunya test mode)',
          transaction_id: `paydunya_test_transfer_${payoutId}`,
          amount: bookingData.owner_amount
        };
        transferId = transferResult.transaction_id;
        
        console.log(`[${timestamp}] ⚠️ PAYDUNYA TEST MODE: Simulated transfer of ${bookingData.owner_amount} XOF`);
      } else {
        // Real PayDunya transfer
        try {
          const transferData = {
            account_alias: owner.mobile_money,
            amount: Math.round(bookingData.owner_amount),
            withdraw_mode: "PER" // Perfect Money withdrawal mode
          };

          console.log(`[${timestamp}] PayDunya transfer data:`, transferData);

          const transferResponse = await fetchWithTimeout('https://app.paydunya.com/sandbox-api/v1/direct-pay/credit-account', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'PAYDUNYA-MASTER-KEY': paydunya_master_key,
              'PAYDUNYA-PRIVATE-KEY': paydunya_private_key,
              'PAYDUNYA-TOKEN': paydunya_token
            },
            body: JSON.stringify(transferData)
          });

          transferResult = await transferResponse.json();
          transferId = transferResult.transaction_id || transferResult.response_data?.transaction_id;
          
          console.log(`[${timestamp}] PayDunya transfer response:`, transferResult);
        } catch (error) {
          console.error(`[${timestamp}] PayDunya transfer failed:`, error);
          transferResult = {
            success: false,
            response_text: error.message,
            response_code: 'ERROR'
          };
        }
      }
    } else {
      // CinetPay Transfer (existing logic)
      const isCinetPayTestMode = !cinetpayTransferLogin || !cinetpayTransferPwd;
      
      if (isCinetPayTestMode) {
        // Simulate successful transfer
        transferResult = {
          code: '00',
          success: true,
          message: 'Transfer completed successfully (CinetPay test mode)',
          transaction_id: `cinetpay_test_transfer_${payoutId}`,
          amount: bookingData.owner_amount
        };
        transferId = transferResult.transaction_id;
        
        console.log(`[${timestamp}] ⚠️ CINETPAY TEST MODE: Simulated transfer of ${bookingData.owner_amount} XOF`);
      } else {
        // Real CinetPay transfer
        const contactId = owner.cinetpay_contact_id;
        try {
          // Authenticate with CinetPay
          const authResponse = await fetchWithTimeout('https://api-money-transfer.cinetpay.com/v2/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              login: cinetpayTransferLogin,
              password: cinetpayTransferPwd
            })
          });

          if (!authResponse.ok) {
            throw new Error(`CinetPay auth failed: ${authResponse.status}`);
          }

          const authData = await authResponse.json();
          if (!authData.success) {
            throw new Error(`CinetPay auth failed: ${authData.message}`);
          }

          // Execute transfer
          const transferData = {
            amount: Math.round(bookingData.owner_amount),
            client_transaction_id: payoutId,
            contact_id: contactId,
            currency: 'XOF',
            description: `MySport payout - ${bookingData.fields.name}`,
            notify_url: `${supabaseUrl}/functions/v1/cinetpay-transfer-webhook`
          };

          const transferResponse = await fetchWithTimeout('https://api-money-transfer.cinetpay.com/v2/transfer', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authData.access_token}`
            },
            body: JSON.stringify(transferData)
          });

          transferResult = await transferResponse.json();
          transferId = transferResult.transaction_id;
          
          console.log(`[${timestamp}] CinetPay transfer response:`, transferResult);
        } catch (error) {
          console.error(`[${timestamp}] CinetPay transfer failed:`, error);
          transferResult = {
            success: false,
            message: error.message,
            code: 'ERROR'
          };
        }
      }
    }

    // Step 6: Update payout status
    let newStatus, shouldMarkBookingSent;
    
    if (paymentProvider === 'paydunya') {
      // PayDunya success check
      const isSuccess = transferResult.success && transferResult.response_code === '00';
      newStatus = isSuccess ? 'completed' : 'failed';
      shouldMarkBookingSent = isSuccess;
    } else {
      // CinetPay success check
      const isSuccess = transferResult.success && transferResult.code === '00';
      newStatus = isSuccess ? 'completed' : 'failed';
      shouldMarkBookingSent = isSuccess;
    }

    // Update payout with provider-specific transfer ID
    const updateData = {
      status: newStatus,
      transfer_response: transferResult,
      updated_at: new Date().toISOString()
    };
    
    // Add provider-specific transfer ID
    if (paymentProvider === 'paydunya') {
      updateData.provider_transfer_id = transferId;
    } else {
      updateData.cinetpay_transfer_id = transferId;
    }

    const { error: updatePayoutError } = await supabase
      .from('payouts')
      .update(updateData)
      .eq('id', payoutId);

    if (updatePayoutError) {
      console.error(`[${timestamp}] Failed to update payout:`, updatePayoutError);
    }

    // Step 7: Mark booking as payout sent if successful
    if (shouldMarkBookingSent) {
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({ payout_sent: true })
        .eq('id', booking_id);

      if (bookingUpdateError) {
        console.error(`[${timestamp}] Failed to update booking:`, bookingUpdateError);
      } else {
        console.log(`[${timestamp}] ✅ Payout completed successfully`);
      }
    }

    // Return response
    const response: PayoutResponse = {
      success: transferResult.success,
      message: (transferResult.message || transferResult.response_text) || `Payout ${newStatus}`,
      payout_id: payoutId,
      amount: bookingData.owner_amount,
      payment_provider: paymentProvider
    };
    
    // Add provider-specific transfer ID to response
    if (paymentProvider === 'paydunya') {
      response.provider_transfer_id = transferId;
    } else {
      response.cinetpay_transfer_id = transferId;
    }

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