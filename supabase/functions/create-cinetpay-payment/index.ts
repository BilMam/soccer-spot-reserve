// supabase/functions/create-cinetpay-payment/index.ts
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
  platform_fee_owner: number;
  owner_amount: number;
  currency: string;
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [create-cinetpay-payment] ▶️ Fonction démarrée`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === ENVIRONNEMENT ===
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const cinetpayApiKey = Deno.env.get('CINETPAY_API_KEY');
    const cinetpaySiteId = Deno.env.get('CINETPAY_SITE_ID');
    const notifyUrl =
      Deno.env.get('CINETPAY_NOTIFY_URL') ||
      'https://zldawmyoscicxoiqvfpu.supabase.co/functions/v1/cinetpay-webhook';
    const baseUrl = Deno.env.get('PUBLIC_BASE_URL') || 'https://pisport.app';

    if (!supabaseUrl || !supabaseServiceKey || !cinetpayApiKey || !cinetpaySiteId) {
      throw new Error('❌ Variables d’environnement manquantes');
    }

    // === AUTHENTIFICATION ===
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header manquant');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error('Authentification échouée');

    // === DONNÉES REÇUES ===
    const paymentData: PaymentData = await req.json();
    const { booking_id, amount, field_name, date, time } = paymentData;
    console.log(`[${timestamp}] [create-cinetpay-payment] Données reçues:`, paymentData);

    const [start_time, end_time] = time.split(' - ');

    // === VÉRIF RÉSERVATION ===
    const { data: existingBooking, error: bookingFetchError } = await supabase
      .from('bookings')
      .select('field_id, user_id, field_price')
      .eq('id', booking_id)
      .single();

    if (bookingFetchError || !existingBooking) throw new Error('Réservation introuvable');

    if (existingBooking.user_id !== userData.user.id)
      throw new Error('Accès non autorisé à cette réservation');

    const price = existingBooking.field_price || amount;

    // === CALCUL FRAIS ===
    const fieldPrice = price;
    const platformFeeUser = Math.round(price * 0.03); // frais utilisateur
    const platformFeeOwner = Math.round(price * 0.05); // commission plateforme
    const ownerAmount = price - platformFeeOwner;
    const amountCheckout = price + platformFeeUser;

    console.log(`[${timestamp}] [create-cinetpay-payment] 💰 Calcul des frais :`, {
      field_price: fieldPrice,
      platform_fee_user: platformFeeUser,
      platform_fee_owner: platformFeeOwner,
      owner_amount: ownerAmount,
      amount_checkout: amountCheckout,
    });

    // === MISE À JOUR BOOKING ===
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .update({
        field_price: fieldPrice,
        platform_fee_user: platformFeeUser,
        platform_fee_owner: platformFeeOwner,
        owner_amount: ownerAmount,
        total_price: amountCheckout,
        payment_status: 'pending',
        payment_provider: 'cinetpay',
        payout_sent: false,
      })
      .eq('id', booking_id)
      .select()
      .single();

    if (bookingError || !booking) throw new Error('Échec mise à jour réservation');

    // === INFO TERRAIN ===
    const { data: field } = await supabase
      .from('fields')
      .select('name')
      .eq('id', existingBooking.field_id)
      .single();

    // === CINETPAY CHECKOUT ===
    const transactionId = `checkout_${booking.id}_${Date.now()}`;
    const returnUrl = `${baseUrl}/booking-success?transaction_id=${transactionId}`;

    const cinetpayData = {
      apikey: cinetpayApiKey,
      site_id: cinetpaySiteId,
      transaction_id: transactionId,
      amount: amountCheckout,
      currency: 'XOF',
      description: `Réservation ${field?.name || field_name} - ${date}`,
      return_url: returnUrl,
      notify_url: notifyUrl,
      customer_name: userData.user.user_metadata?.full_name || 'Client',
      customer_email: userData.user.email,
    };

    console.log(`[${timestamp}] [create-cinetpay-payment] 🌐 CinetPay request:`, cinetpayData);

    const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cinetpayData),
    });

    const result = await response.json();
    console.log(`[${timestamp}] [create-cinetpay-payment] 🔁 Réponse CinetPay:`, result);

    if (result.code !== '201' || !result.data?.payment_url) {
      throw new Error(`Erreur CinetPay: ${result.message || 'aucune URL retournée'}`);
    }

    // === SAUVEGARDE TRANSACTION_ID ===
    await supabase
      .from('bookings')
      .update({
        payment_intent_id: transactionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    // === RÉPONSE FRONTEND ===
    const responseData: PaymentResponse = {
      url: result.data.payment_url,
      transaction_id: transactionId,
      amount_checkout: amountCheckout,
      field_price: fieldPrice,
      platform_fee_user: platformFeeUser,
      platform_fee_owner: platformFeeOwner,
      owner_amount: ownerAmount,
      currency: 'XOF',
    };

    console.log(`[${timestamp}] ✅ Paiement CinetPay créé:`, responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error(`[${timestamp}] ❌ Erreur create-cinetpay-payment:`, error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Erreur inconnue',
        timestamp,
        function: 'create-cinetpay-payment',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
