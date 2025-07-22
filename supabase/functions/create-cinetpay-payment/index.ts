
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentData {
  booking_id: string;
  amount: number;
  field_name: string;
  date: string;
  time: string;
}

interface PaymentResponse {
  url: string;
  transaction_id: string;
  amount_checkout: number;
  field_price: number;
  platform_fee_user: number;
  cinetpay_checkout_fee: number;
  currency: string;
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [create-cinetpay-payment] Function started`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const cinetpayApiKey = Deno.env.get('CINETPAY_API_KEY');
    const cinetpaySiteId = Deno.env.get('CINETPAY_SITE_ID');

    if (!supabaseUrl || !supabaseServiceKey || !cinetpayApiKey || !cinetpaySiteId) {
      throw new Error('Configuration manquante');
    }

    // Authentication
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header manquant');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error('Authentification échouée');

    // Parse request data
    const paymentData: PaymentData = await req.json();
    const { booking_id, amount, field_name, date, time } = paymentData;

    console.log(`[${timestamp}] [create-cinetpay-payment] Payment data:`, paymentData);

    // Parse time range (format: "13:00 - 14:00")
    const [start_time, end_time] = time.split(' - ');
    
    // Get booking from database to get field_id and user verification
    const { data: existingBooking, error: bookingFetchError } = await supabaseClient
      .from('bookings')
      .select('field_id, user_id, field_price')
      .eq('id', booking_id)
      .single();

    if (bookingFetchError || !existingBooking) {
      throw new Error('Réservation introuvable');
    }

    // Verify user owns this booking
    if (existingBooking.user_id !== userData.user.id) {
      throw new Error('Accès non autorisé à cette réservation');
    }

    const price = existingBooking.field_price || amount;

    // Calculate fees (3% user + estimated 3% CinetPay)
    const USER_FEE_PCT = 0.03; // 3% payé par utilisateur
    const OWNER_FEE_PCT = 0.05; // 5% déduit du propriétaire (enregistré pour le transfer)
    const platform_fee_user = Math.round(price * USER_FEE_PCT);
    const platform_fee_owner = Math.round(price * OWNER_FEE_PCT);
    const cinetpay_checkout_fee = Math.round(price * 0.03); // Frais CinetPay checkout 3%
    const amount_checkout = Math.round(price * 1.03); // T × 1.03

    console.log(`[${timestamp}] [create-cinetpay-payment] Fee calculation:`, {
      field_price: price,
      platform_fee_user,
      platform_fee_owner,
      cinetpay_checkout_fee,
      amount_checkout
    });

    // Update existing booking with payment info
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .update({
        platform_fee_user,
        platform_fee_owner,
        cinetpay_checkout_fee,
        total_price: amount_checkout,
        payment_status: 'pending'  // Sera changé en 'paid' par le webhook
      })
      .eq('id', booking_id)
      .select()
      .single();

    if (bookingError || !booking) {
      console.error(`[${timestamp}] [create-cinetpay-payment] Booking update failed:`, bookingError);
      throw new Error('Mise à jour réservation échouée');
    }

    // Get field info
    const { data: field } = await supabaseClient
      .from('fields')
      .select('name')
      .eq('id', existingBooking.field_id)
      .single();

    // CinetPay Checkout v2
    const transactionId = `checkout_${booking.id}_${Date.now()}`;
    const baseUrl = supabaseUrl?.replace('.supabase.co', '.lovableproject.com');
    const returnUrl = `${baseUrl}/?tab=reservations&success=true&ref=${transactionId}`;
    const notifyUrl = `https://zldawmyoscicxoiqvfpu.supabase.co/functions/v1/cinetpay-webhook`;

    const cinetpayData = {
      apikey: cinetpayApiKey,
      site_id: cinetpaySiteId,
      transaction_id: transactionId,
      amount: amount_checkout,
      currency: 'XOF',
      description: `Réservation ${field?.name || field_name} - ${date}`,
      return_url: returnUrl,
      notify_url: notifyUrl,
      customer_name: userData.user.user_metadata?.full_name || 'Client',
      customer_email: userData.user.email
    };

    console.log(`[${timestamp}] [create-cinetpay-payment] WEBHOOK URL:`, notifyUrl);
    console.log(`[${timestamp}] [create-cinetpay-payment] CinetPay request:`, cinetpayData);

    const cinetpayResponse = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cinetpayData)
    });

    const cinetpayResult = await cinetpayResponse.json();
    console.log(`[${timestamp}] [create-cinetpay-payment] CinetPay response:`, cinetpayResult);

    if (cinetpayResult.code !== '201') {
      throw new Error(`CinetPay error: ${cinetpayResult.message}`);
    }

    // Update booking with payment info
    await supabaseClient
      .from('bookings')
      .update({
        payment_intent_id: transactionId,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking.id);

    const responseData: PaymentResponse = {
      url: cinetpayResult.data.payment_url,
      transaction_id: transactionId,
      amount_checkout,
      field_price: price,
      platform_fee_user,
      cinetpay_checkout_fee,
      currency: 'XOF'
    };

    console.log(`[${timestamp}] [create-cinetpay-payment] Success:`, responseData);

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error(`[${timestamp}] [create-cinetpay-payment] Error:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp,
        function: 'create-cinetpay-payment'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
