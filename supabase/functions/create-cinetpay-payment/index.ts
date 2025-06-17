
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
  console.log('🚀 PHASE 2 - Edge Function create-cinetpay-payment');
  console.log('📋 Méthode:', req.method);
  console.log('📋 URL:', req.url);
  console.log('📋 Headers:', Object.fromEntries(req.headers.entries()));

  if (req.method === 'OPTIONS') {
    console.log('✅ Réponse OPTIONS pour CORS');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔧 Phase 2 - Initialisation client Supabase...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('🔧 Variables d\'environnement Supabase:', {
      supabaseUrl: supabaseUrl ? `✅ OK (${supabaseUrl.substring(0, 30)}...)` : '❌ MANQUANT',
      supabaseServiceKey: supabaseServiceKey ? '✅ OK' : '❌ MANQUANT'
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuration Supabase manquante - vérifier les variables d\'environnement');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔐 Phase 2 - Vérification authentification...');
    const authHeader = req.headers.get('Authorization');
    console.log('🔐 Auth header présent:', !!authHeader);
    
    if (!authHeader) {
      throw new Error('Header Authorization manquant');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔐 Token extrait:', token ? 'présent' : 'absent');

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError) {
      console.error('❌ Erreur authentification:', authError);
      throw new Error(`Erreur authentification: ${authError.message}`);
    }

    if (!user) {
      console.error('❌ Utilisateur non authentifié');
      throw new Error('Utilisateur non authentifié')
    }

    console.log('✅ Utilisateur authentifié:', {
      id: user.id,
      email: user.email
    });

    console.log('📥 Phase 2 - Lecture données request...');
    const paymentData: PaymentRequest = await req.json()
    console.log('📥 Données reçues Phase 2:', paymentData)

    const { booking_id, amount, field_name, date, time } = paymentData

    // Validation renforcée Phase 2
    console.log('🔍 Phase 2 - Validation renforcée des données...');
    const validationErrors = [];
    
    if (!booking_id) validationErrors.push('booking_id manquant');
    if (!amount || amount <= 0) validationErrors.push(`amount invalide: ${amount}`);
    if (!field_name) validationErrors.push('field_name manquant');
    if (!date) validationErrors.push('date manquante');
    if (!time) validationErrors.push('time manquant');

    // Vérification du montant minimum (100 XOF pour CinetPay)
    if (amount < 100) {
      validationErrors.push(`Montant trop faible: ${amount} XOF (minimum 100 XOF)`);
    }

    if (validationErrors.length > 0) {
      console.error('❌ Erreurs validation Phase 2:', validationErrors);
      throw new Error(`Validation échouée: ${validationErrors.join(', ')}`);
    }

    console.log('✅ Validation Phase 2 réussie');

    // Récupérer et vérifier la réservation
    console.log('📖 Phase 2 - Récupération réservation...');
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

    console.log('✅ Réservation trouvée Phase 2:', {
      id: booking.id,
      user_id: booking.user_id,
      total_price: booking.total_price,
      field_name: booking.fields.name,
      status: booking.status,
      payment_status: booking.payment_status
    });

    // Vérifier que l'utilisateur est propriétaire de la réservation
    if (booking.user_id !== user.id) {
      console.error('❌ Utilisateur non autorisé pour cette réservation');
      throw new Error('Non autorisé - cette réservation ne vous appartient pas');
    }

    // Vérifier les clés API CinetPay
    console.log('🔑 Phase 2 - Vérification clés CinetPay...');
    const cinetpayApiKey = Deno.env.get('CINETPAY_API_KEY')
    const cinetpaySiteId = Deno.env.get('CINETPAY_SITE_ID')

    console.log('🔑 Clés CinetPay Phase 2:', {
      apiKey: cinetpayApiKey ? `✅ OK (${cinetpayApiKey.substring(0, 10)}...)` : '❌ MANQUANT',
      siteId: cinetpaySiteId ? `✅ OK (${cinetpaySiteId})` : '❌ MANQUANT'
    });

    if (!cinetpayApiKey || !cinetpaySiteId) {
      console.error('❌ Clés API CinetPay non configurées');
      throw new Error('Configuration CinetPay manquante')
    }

    // Calculer les montants (commission de 5%)
    const platformFee = Math.round(amount * 0.05)
    const ownerAmount = amount - platformFee

    console.log('💰 Phase 2 - Calcul montants:', { 
      amount, 
      platformFee, 
      ownerAmount,
      verificationBooking: booking.total_price
    })

    // Vérifier cohérence montant
    if (Math.abs(amount - booking.total_price) > 1) {
      console.warn('⚠️ Différence montant détectée:', {
        amountRequest: amount,
        amountBooking: booking.total_price,
        difference: Math.abs(amount - booking.total_price)
      });
    }

    // Créer la transaction CinetPay
    const transactionId = `escrow_${booking_id}_${Date.now()}`
    
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovableproject.com')
    const returnUrl = `${baseUrl}/booking-success?session_id=booking_${booking_id}`
    const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/cinetpay-escrow-webhook`

    console.log('🔗 Phase 2 - URLs configurées:', {
      baseUrl,
      returnUrl,
      notifyUrl
    });

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

    console.log('💳 Phase 2 - Appel API CinetPay...');
    console.log('💳 Données envoyées Phase 2:', {
      ...cinetpayPaymentData,
      apikey: '***MASKED***' // Masquer la clé API dans les logs
    });

    const cinetpayResponse = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cinetpayPaymentData)
    })

    console.log('📡 Phase 2 - Statut réponse CinetPay:', cinetpayResponse.status);
    console.log('📡 Headers réponse Phase 2:', Object.fromEntries(cinetpayResponse.headers.entries()));

    const result = await cinetpayResponse.json()
    console.log('📡 Phase 2 - Contenu réponse CinetPay:', result)

    if (!cinetpayResponse.ok || result.code !== '201') {
      console.error('❌ Erreur API CinetPay Phase 2:', {
        status: cinetpayResponse.status,
        ok: cinetpayResponse.ok,
        code: result.code,
        message: result.message,
        description: result.description,
        details: result
      });
      throw new Error(`Erreur CinetPay (${result.code}): ${result.message || result.description || 'Erreur inconnue'}`)
    }

    console.log('✅ Phase 2 - Paiement CinetPay créé avec succès');

    // Mettre à jour la réservation
    console.log('📝 Phase 2 - Mise à jour réservation...');
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        cinetpay_transaction_id: transactionId,
        payment_provider: 'cinetpay',
        platform_fee: platformFee,
        owner_amount: ownerAmount,
        payment_status: 'pending',
        escrow_status: 'none',
        status: 'pending_payment',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id)

    if (updateError) {
      console.error('❌ Erreur mise à jour réservation Phase 2:', updateError)
      throw updateError
    }

    console.log('✅ Phase 2 - Réservation mise à jour');

    const responseData = {
      url: result.data.payment_url,
      transaction_id: transactionId,
      escrow_mode: true,
      confirmation_deadline: '24 heures après paiement',
      phase: 'Phase 2 - Corrections appliquées',
      amount: amount,
      currency: 'XOF'
    };

    console.log('🎉 Phase 2 - Succès complet - Envoi réponse:', responseData);

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('💥 ERREUR GLOBALE Phase 2 Edge Function:', error)
    console.error('💥 Stack trace Phase 2:', error.stack)
    console.error('💥 Type erreur:', typeof error)
    console.error('💥 Nom erreur:', error.name)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        function: 'create-cinetpay-payment',
        phase: 'Phase 2 - Diagnostic approfondi',
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
