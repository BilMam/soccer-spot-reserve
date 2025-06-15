
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (!user) {
      throw new Error('Utilisateur non authentifié')
    }

    const paymentData: PaymentRequest = await req.json()
    console.log('Données reçues:', paymentData)

    const { booking_id, amount, field_name, date, time } = paymentData

    // Validation des données
    if (!booking_id) {
      throw new Error('booking_id manquant')
    }
    if (!amount || amount <= 0) {
      throw new Error('amount manquant ou invalide')
    }
    if (!field_name) {
      throw new Error('field_name manquant')
    }
    if (!date) {
      throw new Error('date manquante')
    }
    if (!time) {
      throw new Error('time manquant')
    }

    console.log('✅ Validation réussie - Traitement paiement CinetPay pour:', { booking_id, amount, field_name, date, time })

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

    if (!cinetpayApiKey || !cinetpaySiteId) {
      throw new Error('Clés API CinetPay non configurées')
    }

    // Calculer les montants (commission de 5%)
    const platformFee = Math.round(amount * 0.05)
    const ownerAmount = amount - platformFee

    console.log('Montants calculés:', { amount, platformFee, ownerAmount })

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

    console.log('Données paiement CinetPay:', cinetpayPaymentData)

    const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cinetpayPaymentData)
    })

    const result = await response.json()
    console.log('Réponse CinetPay:', result)

    if (!response.ok || result.code !== '201') {
      console.error('Erreur CinetPay:', result)
      throw new Error(`Erreur CinetPay (${result.code}): ${result.message || result.description || 'Erreur inconnue'}`)
    }

    // Mettre à jour la réservation
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
      console.error('Erreur mise à jour réservation:', updateError)
      throw updateError
    }

    console.log('✅ Paiement CinetPay créé avec succès')

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
    console.error('❌ Erreur création paiement CinetPay:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
