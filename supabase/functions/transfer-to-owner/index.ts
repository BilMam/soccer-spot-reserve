import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CinetPayAuthResponse {
  code: string;
  message: string;
  data: { token: string };
}

interface CinetPayTransferResponse {
  code: string;
  message: string;
  data?: any;
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [transfer-to-owner] Function started`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment variables
    const transferLogin = Deno.env.get('CINETPAY_TRANSFER_LOGIN');
    const transferPwd = Deno.env.get('CINETPAY_TRANSFER_PWD');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!transferLogin || !transferPwd || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuration CinetPay Transfer manquante');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { booking_id } = await req.json();

    console.log(`[${timestamp}] [transfer-to-owner] Processing booking: ${booking_id}`);

    // Get booking with field and owner info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        fields (
          owner_id,
          name
        )
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error('Réservation non trouvée');
    }

    // Check booking status
    if (booking.status !== 'confirmed' || booking.payment_status !== 'completed') {
      throw new Error('Réservation non confirmée ou paiement non finalisé');
    }

    // Check if transfer already done
    if (booking.cinetpay_transfer_id) {
      console.log(`[${timestamp}] [transfer-to-owner] Transfer already completed: ${booking.cinetpay_transfer_id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Transfert déjà effectué',
          transfer_id: booking.cinetpay_transfer_id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate owner amount: T × 0.95 rounded to multiple of 5
    const OWNER_FEE_PCT = 0.05; // 5% commission propriétaire
    const owner_amount_raw = (booking.field_price || 0) * (1 - OWNER_FEE_PCT);
    const owner_amount = Math.floor(owner_amount_raw / 5) * 5; // Round down to multiple of 5

    if (owner_amount <= 0) {
      throw new Error('Montant de transfert invalide');
    }

    console.log(`[${timestamp}] [transfer-to-owner] Amount calculation:`, {
      field_price: booking.field_price,
      platform_fee_owner: booking.platform_fee_owner,
      owner_amount_raw,
      owner_amount
    });

    // Get owner payment account
    const { data: paymentAccount, error: accountError } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('owner_id', booking.fields.owner_id)
      .eq('payment_provider', 'cinetpay')
      .single();

    if (accountError || !paymentAccount || !paymentAccount.cinetpay_contact_added) {
      throw new Error('Contact propriétaire non configuré dans CinetPay');
    }

    // Step 1: Authenticate with CinetPay Transfer API
    console.log(`[${timestamp}] [transfer-to-owner] Authenticating with CinetPay Transfer API`);
    const authResponse = await fetch('https://client.cinetpay.com/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: transferLogin,
        password: transferPwd
      })
    });

    const authResult: CinetPayAuthResponse = await authResponse.json();
    console.log(`[${timestamp}] [transfer-to-owner] Auth response:`, authResult);

    if (authResult.code !== 'OPERATION_SUCCES') {
      throw new Error(`Échec authentification CinetPay: ${authResult.message}`);
    }

    // Step 2: Perform transfer
    const client_transaction_id = `transfer_${booking_id}_${Date.now()}`;
    const notifyUrl = `${supabaseUrl}/functions/v1/cinetpay-transfer-webhook`;
    
    const transferData = [{
      prefix: paymentAccount.country_prefix || '225',
      phone: paymentAccount.phone,
      amount: owner_amount,
      notify_url: notifyUrl,
      client_transaction_id,
      payment_method: 'ORANGE_MONEY' // Default payment method
    }];

    console.log(`[${timestamp}] [transfer-to-owner] Transfer data:`, transferData);

    const transferResponse = await fetch(`https://client.cinetpay.com/v1/transfer/money/send/contact?token=${authResult.data.token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: JSON.stringify(transferData) })
    });

    const transferResult: CinetPayTransferResponse = await transferResponse.json();
    console.log(`[${timestamp}] [transfer-to-owner] Transfer response:`, transferResult);

    // Create payout record
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert({
        booking_id,
        owner_id: booking.fields.owner_id,
        amount: owner_amount,
        platform_fee_owner: booking.platform_fee_owner,
        cinetpay_transfer_id: client_transaction_id,
        status: transferResult.code === 'OPERATION_SUCCES' ? 'pending' : 'failed',
        transfer_response: transferResult
      })
      .select()
      .single();

    if (payoutError) {
      console.error(`[${timestamp}] [transfer-to-owner] Payout creation failed:`, payoutError);
    }

    // Update booking with transfer info
    await supabase
      .from('bookings')
      .update({
        cinetpay_transfer_id: client_transaction_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id);

    if (transferResult.code === 'OPERATION_SUCCES') {
      console.log(`[${timestamp}] [transfer-to-owner] Transfer successful`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Transfert initié avec succès',
          transfer_id: client_transaction_id,
          amount: owner_amount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error(`Échec transfert: ${transferResult.message}`);
    }

  } catch (error) {
    console.error(`[${timestamp}] [transfer-to-owner] Error:`, error);
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