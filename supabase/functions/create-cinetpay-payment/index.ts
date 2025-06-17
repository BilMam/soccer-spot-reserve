
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  booking_id: string;
  amount: number;
  field_name: string;
  date: string;
  time: string;
}

serve(async (req) => {
  console.log('🚀 DÉBUT Edge Function create-cinetpay-payment');
  console.log('📋 Méthode:', req.method);
  console.log('📋 Headers:', Object.fromEntries(req.headers.entries()));

  if (req.method === 'OPTIONS') {
    console.log('✅ Réponse OPTIONS pour CORS');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔧 Initialisation client Supabase...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('🔧 Variables d\'environnement:', {
      supabaseUrl: supabaseUrl ? '✅ OK' : '❌ MANQUANT',
      supabaseServiceKey: supabaseServiceKey ? '✅ OK' : '❌ MANQUANT'
    });

    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseServiceKey ?? '',
    )

    console.log('🔐 Vérification authentification...');
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (authError) {
      console.error('❌ Erreur authentification:', authError);
      throw new Error(`Erreur authentification: ${authError.message}`);
    }

    if (!user) {
      console.error('❌ Utilisateur non authentifié');
      throw new Error('Utilisateur non authentifié')
    }

    console.log('✅ Utilisateur authentifié:', user.id);

    console.log('📥 Lecture données request...');
    const paymentData: PaymentRequest = await req.json()
    console.log('📥 Données reçues:', paymentData)

    const { booking_id, amount, field_name, date, time } = paymentData

    // Validation des données
    console.log('🔍 Validation des données...');
    const validationErrors = [];
    
    if (!booking_id) validationErrors.push('booking_id manquant');
    if (!amount || amount <= 0) validationErrors.push('amount manquant ou invalide');
    if (!field_name) validationErrors.push('field_name manquant');
    if (!date) validationErrors.push('date manquante');
    if (!time) validationErrors.push('time manquant');

    if (validationErrors.length > 0) {
      console.error('❌ Erreurs validation:', validationErrors);
      throw new Error(`Validation échouée: ${validationErrors.join(', ')}`);
    }

    console.log('✅ Validation réussie');

    // Récupérer les informations de la réservation
    console.log('📖 Récupération réservation...');
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        fields!inner(owner_id, name)
      `)
      .eq('id', booking_id)
      .single()

    if (bookingError) {
      console.error('❌ Erreur récupération réservation:', bookingError)
      throw new Error(`Réservation non trouvée: ${bookingError.message}`)
    }

    console.log('✅ Réservation trouvée:', {
      id: booking.id,
      user_id: booking.user_id,
      total_price: booking.total_price,
      field_name: booking.fields.name
    });

    // Vérifier les clés API CinetPay
    console.log('🔑 Vérification clés CinetPay...');
    const cinetpayApiKey = Deno.env.get('CINETPAY_API_KEY')
    const cinetpaySiteId = Deno.env.get('CINETPAY_SITE_ID')

    console.log('🔑 Clés CinetPay:', {
      apiKey: cinetpayApiKey ? '✅ OK' : '❌ MANQUANT',
      siteId: cinetpaySiteId ? '✅ OK' : '❌ MANQUANT'
    });

    if (!cinetpayApiKey || !cinetpaySiteId) {
      console.error('❌ Clés API CinetPay non configurées');
      throw new Error('Configuration CinetPay manquante')
    }

    // Calculer les montants (commission de 5%)
    const platformFee = Math.round(amount * 0.05)
    const ownerAmount = amount - platformFee

    console.log('💰 Calcul montants:', { amount, platformFee, ownerAmount })

    // Créer la transaction CinetPay
    const transactionId = `escrow_${booking_id}_${Date.now()}`
    
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovableproject.com')
    const returnUrl = `${baseUrl}/booking-success?session_id=booking_${booking_id}`
    const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/cinetpay-escrow-webhook`

    const cinetpayPaymentData = {
      apikey: cinetpayApiKey,
      site_id: parseInt(cinetpaySiteId),
      transaction_id: transactionId,
      amount: amount,
      currency: 'XOF',
      description: `Réservation ${field_name} - ${date} ${time}`,
      return_url: returnUrl,
      notify_url: notifyUrl,
      customer_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Client',
      customer_email: user.email,
      channels: 'ALL',
    }

    console.log('💳 Appel API CinetPay...');
    console.log('💳 Données envoyées:', {
      ...cinetpayPaymentData,
      apikey: '***MASKED***' // Masquer la clé API dans les logs
    });

    const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cinetpayPaymentData)
    })

    console.log('📡 Statut réponse CinetPay:', response.status);
    console.log('📡 Headers réponse:', Object.fromEntries(response.headers.entries()));

    const result = await response.json()
    console.log('📡 Contenu réponse CinetPay:', result)

    if (!response.ok || result.code !== '201') {
      console.error('❌ Erreur API CinetPay:', {
        status: response.status,
        ok: response.ok,
        code: result.code,
        message: result.message,
        description: result.description
      });
      throw new Error(`Erreur CinetPay (${result.code}): ${result.message || result.description || 'Erreur inconnue'}`)
    }

    console.log('✅ Paiement CinetPay créé avec succès');

    // Mettre à jour la réservation
    console.log('📝 Mise à jour réservation...');
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        cinetpay_transaction_id: transactionId,
        payment_provider: 'cinetpay',
        platform_fee: platformFee,
        owner_amount: ownerAmount,
        payment_status: 'pending',
        escrow_status: 'none',
        status: 'pending_payment'
      })
      .eq('id', booking_id)

    if (updateError) {
      console.error('❌ Erreur mise à jour réservation:', updateError)
      throw updateError
    }

    console.log('✅ Réservation mise à jour');

    const responseData = {
      url: result.data.payment_url,
      transaction_id: transactionId,
      escrow_mode: true,
      confirmation_deadline: '24 heures après paiement'
    };

    console.log('🎉 Succès - Envoi réponse:', responseData);

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('💥 ERREUR GLOBALE Edge Function:', error)
    console.error('💥 Stack trace:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        function: 'create-cinetpay-payment'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
