
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Utiliser la clé de service pour avoir accès complet à la base de données
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (!user) {
      throw new Error('Utilisateur non authentifié')
    }

    // Lire le body de la requête
    const requestBody = await req.text()
    console.log('Body brut reçu:', requestBody)
    
    let paymentData: PaymentRequest
    try {
      paymentData = JSON.parse(requestBody)
    } catch (parseError) {
      console.error('Erreur parsing JSON:', parseError)
      throw new Error('Format de données invalide')
    }

    const { booking_id, amount, field_name, date, time } = paymentData

    console.log('Données parsées:', { booking_id, amount, field_name, date, time })
    console.log('Types des données:', {
      booking_id_type: typeof booking_id,
      amount_type: typeof amount,
      field_name_type: typeof field_name,
      date_type: typeof date,
      time_type: typeof time
    })

    // Validation améliorée des données
    if (!booking_id || booking_id === '' || booking_id === 'undefined') {
      throw new Error('booking_id manquant ou invalide')
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new Error('amount manquant ou invalide')
    }
    if (!field_name || field_name === '' || field_name === 'undefined') {
      throw new Error('field_name manquant ou invalide')
    }
    if (!date || date === '' || date === 'undefined') {
      throw new Error('date manquante ou invalide')
    }
    if (!time || time === '' || time === 'undefined') {
      throw new Error('time manquant ou invalide')
    }

    console.log('✅ Toutes les validations passées - Traitement paiement CinetPay escrow pour:', { booking_id, amount, field_name, date, time })

    // Récupérer les informations de la réservation
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        fields!inner(owner_id, name)
      `)
      .eq('id', booking_id)
      .single()

    if (bookingError) {
      console.error('Erreur récupération réservation:', bookingError)
      throw new Error(`Réservation non trouvée: ${bookingError.message}`)
    }

    console.log('Réservation trouvée:', booking)

    // Vérifier les clés API CinetPay
    const cinetpayApiKey = Deno.env.get('CINETPAY_API_KEY')
    const cinetpaySiteId = Deno.env.get('CINETPAY_SITE_ID')

    console.log('Vérification clés API:', { 
      hasApiKey: !!cinetpayApiKey, 
      hasSiteId: !!cinetpaySiteId,
      siteId: cinetpaySiteId 
    })

    if (!cinetpayApiKey || !cinetpaySiteId) {
      throw new Error('Clés API CinetPay non configurées')
    }

    // Calculer les montants (commission de 5%)
    const platformFee = Math.round(amount * 0.05)
    const ownerAmount = amount - platformFee

    console.log('Montants calculés:', { amount, platformFee, ownerAmount })

    // Créer la transaction CinetPay - TOUT VA VERS LE COMPTE PLATEFORME
    const transactionId = `escrow_${booking_id}_${Date.now()}`
    
    // Construire l'URL de retour correctement
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovableproject.com')
    const returnUrl = `${baseUrl}/booking-success?session_id=booking_${booking_id}`
    const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/cinetpay-escrow-webhook`

    console.log('URLs configurées:', { returnUrl, notifyUrl })

    const cinetpayPaymentData = {
      apikey: cinetpayApiKey,
      site_id: parseInt(cinetpaySiteId), // S'assurer que c'est un nombre
      transaction_id: transactionId,
      amount: amount,
      currency: 'XOF',
      description: `Réservation ${field_name} - ${date} ${time}`,
      return_url: returnUrl,
      notify_url: notifyUrl,
      customer_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Client',
      customer_email: user.email,
      channels: 'ALL',
      // PAS DE SPLIT PAYMENT - Tout va vers la plateforme en escrow
    }

    console.log('Données paiement CinetPay (Escrow centralisé):', cinetpayPaymentData)

    const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cinetpayPaymentData)
    })

    const result = await response.json()
    console.log('Réponse CinetPay:', result)
    console.log('Status HTTP:', response.status)

    if (!response.ok) {
      console.error('Erreur HTTP CinetPay:', response.status, result)
      throw new Error(`Erreur HTTP ${response.status}: ${result.message || 'Erreur inconnue'}`)
    }

    if (result.code !== '201') {
      console.error('Erreur CinetPay:', result)
      throw new Error(`Erreur CinetPay (${result.code}): ${result.message || result.description || 'Erreur inconnue'}`)
    }

    // Mettre à jour la réservation avec les informations d'escrow
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        cinetpay_transaction_id: transactionId,
        payment_provider: 'cinetpay',
        platform_fee: platformFee,
        owner_amount: ownerAmount,
        payment_status: 'pending',
        escrow_status: 'none', // Sera mis à jour par le webhook après paiement
        status: 'pending_payment' // Nouveau statut pour indiquer qu'on attend le paiement
      })
      .eq('id', booking_id)

    if (updateError) {
      console.error('Erreur mise à jour réservation:', updateError)
      throw updateError
    }

    console.log('✅ Paiement CinetPay escrow créé avec succès')

    return new Response(
      JSON.stringify({
        url: result.data.payment_url,
        transaction_id: transactionId,
        escrow_mode: true,
        confirmation_deadline: '24 heures après paiement'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Erreur création paiement CinetPay escrow:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
