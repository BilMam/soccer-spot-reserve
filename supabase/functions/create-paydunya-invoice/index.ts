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
  token: string;
  amount_checkout: number;
  field_price: number;
  platform_fee_user: number;
  platform_fee_owner: number;
  owner_amount: number;
  currency: string;
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [create-paydunya-invoice] Function started`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const paydunya_master_key = Deno.env.get('PAYDUNYA_MASTER_KEY');
    const paydunya_private_key = Deno.env.get('PAYDUNYA_PRIVATE_KEY');
    const paydunya_token = Deno.env.get('PAYDUNYA_TOKEN');
    const paydunya_return_url = Deno.env.get('PAYDUNYA_RETURN_URL');
    const paydunya_cancel_url = Deno.env.get('PAYDUNYA_CANCEL_URL');

    if (!supabaseUrl || !supabaseServiceKey || !paydunya_master_key || !paydunya_private_key || !paydunya_token) {
      throw new Error('Configuration PayDunya manquante');
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

    console.log(`[${timestamp}] [create-paydunya-invoice] Payment data:`, paymentData);

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

    // Calculate fees - Exactement comme CinetPay
    const fieldPrice = price;                            // T (prix terrain) 
    const platformFeeUser = Math.round(price * 0.03);    // 3% frais utilisateur MySport
    const platformFeeOwner = Math.round(price * 0.05);   // 5% commission plateforme
    const ownerAmount = price - platformFeeOwner;        // 95% pour le propriétaire
    const amountCheckout = price + platformFeeUser;      // Montant envoyé à PayDunya

    console.log(`[${timestamp}] [create-paydunya-invoice] Fee calculation:`, {
      field_price: fieldPrice,
      platform_fee_user: platformFeeUser,
      platform_fee_owner: platformFeeOwner,
      owner_amount: ownerAmount,
      amount_checkout: amountCheckout
    });

    // Update existing booking with payment info
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .update({
        field_price: fieldPrice,
        platform_fee_user: platformFeeUser,
        platform_fee_owner: platformFeeOwner,
        owner_amount: ownerAmount,
        total_price: amountCheckout,
        payment_status: 'pending',
        payment_provider: 'paydunya',
        payout_sent: false
      })
      .eq('id', booking_id)
      .select()
      .single();

    if (bookingError || !booking) {
      console.error(`[${timestamp}] [create-paydunya-invoice] Booking update failed:`, bookingError);
      throw new Error('Mise à jour réservation échouée');
    }

    // Get field info
    const { data: field } = await supabaseClient
      .from('fields')
      .select('name')
      .eq('id', existingBooking.field_id)
      .single();

    // PayDunya Invoice Creation
    const invoice_token = `paydunya_${booking.id}_${Date.now()}`;
    const callback_url = 'https://qhrxetwdnwxbchdupitq.functions.supabase.co/paydunya-ipn';

    const paydunya_data = {
      invoice: {
        total_amount: amountCheckout,
        description: `Réservation ${field?.name || field_name} - ${date}`
      },
      store: {
        name: "MySport",
        tagline: "Plateforme de réservation de terrains"
      },
      custom_data: {
        booking_id: booking.id,
        user_id: userData.user.id
      },
      actions: {
        return_url: paydunya_return_url || `${supabaseUrl?.replace('.supabase.co', '.lovableproject.com')}/mes-reservations?success=true`,
        cancel_url: paydunya_cancel_url || `${supabaseUrl?.replace('.supabase.co', '.lovableproject.com')}/mes-reservations?cancelled=true`,
        callback_url: callback_url
      }
    };

    console.log(`[${timestamp}] [create-paydunya-invoice] PayDunya request:`, paydunya_data);
    console.log(`[${timestamp}] [create-paydunya-invoice] Callback URL:`, callback_url);

    // Call PayDunya API
    const paydunya_response = await fetch('https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': paydunya_master_key,
        'PAYDUNYA-PRIVATE-KEY': paydunya_private_key,
        'PAYDUNYA-TOKEN': paydunya_token
      },
      body: JSON.stringify(paydunya_data)
    });

    const paydunya_result = await paydunya_response.json();
    console.log(`[${timestamp}] [create-paydunya-invoice] PayDunya response:`, paydunya_result);

    if (!paydunya_response.ok || !paydunya_result.response_code || paydunya_result.response_code !== "00") {
      throw new Error(`PayDunya error: ${paydunya_result.response_text || 'Unknown error'}`);
    }

    const payment_url = paydunya_result.response_data?.invoice_url;
    const paydunya_token_response = paydunya_result.response_data?.invoice_token;

    if (!payment_url || !paydunya_token_response) {
      throw new Error('PayDunya response manque payment_url ou token');
    }

    // Update booking with PayDunya payment info
    await supabaseClient
      .from('bookings')
      .update({
        payment_intent_id: paydunya_token_response,
        payment_url: payment_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking.id);

    const responseData: PaymentResponse = {
      url: payment_url,
      token: paydunya_token_response,
      amount_checkout: amountCheckout,
      field_price: fieldPrice,
      platform_fee_user: platformFeeUser,
      platform_fee_owner: platformFeeOwner,
      owner_amount: ownerAmount,
      currency: 'XOF'
    };

    console.log(`[${timestamp}] [create-paydunya-invoice] Success:`, responseData);

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error(`[${timestamp}] [create-paydunya-invoice] Error:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp,
        function: 'create-paydunya-invoice'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});