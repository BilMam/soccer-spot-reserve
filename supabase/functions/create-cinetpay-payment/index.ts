
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

    const { booking_id, amount, field_name, date, time }: PaymentRequest = await req.json()

    console.log('Traitement paiement CinetPay escrow pour:', { booking_id, amount, field_name, date, time })

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

    // Créer la transaction CinetPay - TOUT VA VERS LE COMPTE PLATEFORME
    const transactionId = `escrow_${booking_id}_${Date.now()}`
    const paymentData = {
      apikey: cinetpayApiKey,
      site_id: cinetpaySiteId,
      transaction_id: transactionId,
      amount: amount,
      currency: 'XOF',
      description: `Réservation ${field_name} - ${date} ${time}`,
      return_url: `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovableproject.com')}/booking-success?session_id=booking_${booking_id}`,
      notify_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/cinetpay-escrow-webhook`,
      customer_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Client',
      customer_email: user.email,
      channels: 'ALL',
      // PAS DE SPLIT PAYMENT - Tout va vers la plateforme en escrow
    }

    console.log('Données paiement CinetPay (Escrow centralisé):', paymentData)

    const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData)
    })

    const result = await response.json()
    console.log('Réponse CinetPay:', result)

    if (!response.ok || result.code !== '201') {
      throw new Error(result.message || 'Erreur lors de la création du paiement CinetPay')
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

    console.log('Paiement CinetPay escrow créé avec succès')

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
    console.error('Erreur création paiement CinetPay escrow:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
