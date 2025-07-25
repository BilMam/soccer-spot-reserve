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
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Test mode if CinetPay credentials are missing
    const isTestMode = !cinetpayTransferLogin || !cinetpayTransferPwd;
    if (isTestMode) {
      console.log(`[${timestamp}] ⚠️ TEST MODE: CinetPay credentials missing - will simulate transfers`);
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
        payout_sent,
        fields!inner (
          id,
          name,
          owner_id,
          owners!inner (
            id,
            phone,
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
    console.log(`[${timestamp}] Found owner: ${owner.id}, phone: ${owner.phone}`);

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

    // Step 3: Validate CinetPay contact exists
    const contactId = owner.cinetpay_contact_id;
    
    if (!contactId) {
      throw new Error(`Owner ${owner.id} has no CinetPay contact. Owner must be registered through signup flow.`);
    }
    
    console.log(`[${timestamp}] [refactor] contact creation logic removed – using existing contact_id only: ${contactId}`);

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

    // Step 5: Execute transfer
    let transferResult;
    let transferId;

    if (isTestMode) {
      // Simulate successful transfer
      transferResult = {
        code: '00',
        success: true,
        message: 'Transfer completed successfully (test mode)',
        transaction_id: `test_transfer_${payoutId}`,
        amount: bookingData.owner_amount
      };
      transferId = transferResult.transaction_id;
      
      console.log(`[${timestamp}] ⚠️ TEST MODE: Simulated transfer of ${bookingData.owner_amount} XOF`);
    } else {
      // Real CinetPay transfer
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
        console.error(`[${timestamp}] Transfer failed:`, error);
        transferResult = {
          success: false,
          message: error.message,
          code: 'ERROR'
        };
      }
    }

    // Step 6: Update payout status
    const newStatus = transferResult.success && transferResult.code === '00' ? 'completed' : 'failed';
    const shouldMarkBookingSent = newStatus === 'completed';

    const { error: updatePayoutError } = await supabase
      .from('payouts')
      .update({
        status: newStatus,
        transfer_response: transferResult,
        cinetpay_transfer_id: transferId,
        updated_at: new Date().toISOString()
      })
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
      message: transferResult.message || `Payout ${newStatus}`,
      payout_id: payoutId,
      amount: bookingData.owner_amount,
      cinetpay_transfer_id: transferId
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