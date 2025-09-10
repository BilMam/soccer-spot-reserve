
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
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
  invoice_token: string;
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
    // Environment variables avec des noms plus clairs
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Vérifier plusieurs variantes possibles des clés PayDunya
    const paydunyaMasterKey = Deno.env.get('PAYDUNYA_MASTER_KEY') || 
                              Deno.env.get('PAYDUNYA_MASTER_KEY_PROD') ||
                              Deno.env.get('PAYDUNYA_PRODUCTION_MASTER_KEY');
    
    const paydunyaPrivateKey = Deno.env.get('PAYDUNYA_PRIVATE_KEY') || 
                               Deno.env.get('PAYDUNYA_PRIVATE_KEY_PROD') ||
                               Deno.env.get('PAYDUNYA_PRODUCTION_PRIVATE_KEY');
    
    const paydunyaToken = Deno.env.get('PAYDUNYA_TOKEN') || 
                          Deno.env.get('PAYDUNYA_TOKEN_PROD') ||
                          Deno.env.get('PAYDUNYA_PRODUCTION_TOKEN');
    
    const paydunyaMode = Deno.env.get('PAYDUNYA_MODE') || 'live';

    console.log(`[${timestamp}] Environment check:`, {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseServiceKey: !!supabaseServiceKey,
      hasPaydunyaMasterKey: !!paydunyaMasterKey,
      hasPaydunyaPrivateKey: !!paydunyaPrivateKey,
      hasPaydunyaToken: !!paydunyaToken,
      paydunyaMode,
      // Debug: vérifier les valeurs exactes (masquées)
      masterKeyLength: paydunyaMasterKey?.length,
      privateKeyLength: paydunyaPrivateKey?.length,
      tokenLength: paydunyaToken?.length
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuration Supabase manquante');
    }

    if (!paydunyaMasterKey || !paydunyaPrivateKey || !paydunyaToken) {
      console.error(`[${timestamp}] Missing PayDunya keys:`, {
        masterKey: paydunyaMasterKey ? 'Present' : 'Missing',
        privateKey: paydunyaPrivateKey ? 'Present' : 'Missing',
        token: paydunyaToken ? 'Present' : 'Missing'
      });
      throw new Error('Configuration PayDunya manquante - Vérifiez vos clés API dans les secrets Supabase');
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

    // Get booking from database
    const { data: existingBooking, error: bookingFetchError } = await supabaseClient
      .from('bookings')
      .select('field_id, user_id, field_price')
      .eq('id', booking_id)
      .maybeSingle();

    if (bookingFetchError || !existingBooking) {
      throw new Error('Réservation introuvable');
    }

    // Verify user owns this booking
    if (existingBooking.user_id !== userData.user.id) {
      throw new Error('Accès non autorisé à cette réservation');
    }

    const price = existingBooking.field_price || amount;

    // Calculate fees - Same model as CinetPay
    const fieldPrice = price;
    const platformFeeUser = Math.round(price * 0.03);    // 3% frais utilisateur MySport
    const platformFeeOwner = Math.round(price * 0.05);   // 5% commission plateforme
    const ownerAmount = price - platformFeeOwner;        // 95% pour le propriétaire
    let amountCheckout = price + platformFeeUser;        // Montant total à payer

    // PayDunya minimum amount is 200 FCFA
    const PAYDUNYA_MIN_AMOUNT = 200;
    if (amountCheckout < PAYDUNYA_MIN_AMOUNT) {
      console.log(`[${timestamp}] [create-paydunya-invoice] Amount ${amountCheckout} below minimum ${PAYDUNYA_MIN_AMOUNT}, adjusting...`);
      amountCheckout = PAYDUNYA_MIN_AMOUNT;
    }

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
      .maybeSingle();

    // PayDunya Invoice creation
    const invoiceToken = `invoice_${booking.id}_${Date.now()}`;
    
    // Update booking with PayDunya info FIRST - before creating invoice
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        payment_intent_id: invoiceToken,
        payment_provider: 'paydunya',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking.id);

    if (updateError) {
      console.error(`[${timestamp}] Failed to update booking with payment_intent_id:`, updateError);
      throw new Error('Failed to link payment to booking');
    }

    console.log(`[${timestamp}] Payment intent linked successfully: ${invoiceToken}`);
    const baseUrl = supabaseUrl?.replace('.supabase.co', '.lovableproject.com');
    const returnUrl = `${baseUrl}/mes-reservations?success=true&ref=${invoiceToken}`;
    const cancelUrl = `${baseUrl}/field/${existingBooking.field_id}`;
    const callbackUrl = `${supabaseUrl}/functions/v1/paydunya-ipn`;

    // PayDunya Invoice API call - Utiliser l'API de production
    const paydunyaApiUrl = paydunyaMode === 'test' ? 
      'https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create' : 
      'https://app.paydunya.com/api/v1/checkout-invoice/create';

    const paydunyaData = {
      invoice: {
        total_amount: amountCheckout,
        description: `Réservation ${field?.name || field_name} - ${date} ${time}`,
      },
      store: {
        name: "MySport",
        tagline: "Réservation de terrains de sport",
        postal_address: "Abidjan, Côte d'Ivoire",
        phone_number: "+225 0707070707",
        website_url: baseUrl,
        logo_url: `${baseUrl}/logo.png`
      },
      actions: {
        cancel_url: cancelUrl,
        return_url: returnUrl,
        callback_url: callbackUrl
      },
      custom_data: {
        booking_id: booking.id,
        user_id: userData.user.id,
        invoice_token: invoiceToken
      }
    };

    console.log(`[${timestamp}] [create-paydunya-invoice] WEBHOOK URL:`, callbackUrl);
    console.log(`[${timestamp}] [create-paydunya-invoice] PayDunya API URL:`, paydunyaApiUrl);
    console.log(`[${timestamp}] [create-paydunya-invoice] PayDunya request:`, paydunyaData);

    console.log(`[${timestamp}] [create-paydunya-invoice] Sending request headers:`, {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': paydunyaMasterKey ? `${paydunyaMasterKey.substring(0, 8)}...` : 'Missing',
      'PAYDUNYA-PRIVATE-KEY': paydunyaPrivateKey ? `${paydunyaPrivateKey.substring(0, 8)}...` : 'Missing',
      'PAYDUNYA-TOKEN': paydunyaToken ? `${paydunyaToken.substring(0, 8)}...` : 'Missing',
      'PAYDUNYA-MODE': paydunyaMode
    });

    const paydunyaResponse = await fetch(paydunyaApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': paydunyaMasterKey,
        'PAYDUNYA-PRIVATE-KEY': paydunyaPrivateKey,
        'PAYDUNYA-TOKEN': paydunyaToken,
        'PAYDUNYA-MODE': paydunyaMode
      },
      body: JSON.stringify(paydunyaData)
    });

    const paydunyaResult = await paydunyaResponse.json();
    console.log(`[${timestamp}] [create-paydunya-invoice] PayDunya response status:`, paydunyaResponse.status);
    console.log(`[${timestamp}] [create-paydunya-invoice] PayDunya response headers:`, Object.fromEntries(paydunyaResponse.headers.entries()));
    console.log(`[${timestamp}] [create-paydunya-invoice] PayDunya response:`, paydunyaResult);

    if (paydunyaResult.response_code !== '00') {
      console.error(`[${timestamp}] PayDunya API Error:`, {
        code: paydunyaResult.response_code,
        text: paydunyaResult.response_text,
        details: paydunyaResult
      });
      throw new Error(`PayDunya error: ${paydunyaResult.response_text || 'Erreur inconnue'}`);
    }

    // Construct successful response data
    const responseData: PaymentResponse = {
      url: paydunyaResult.response_text,
      invoice_token: invoiceToken,
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
