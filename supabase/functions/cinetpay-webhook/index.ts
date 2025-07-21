import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { cpm_trans_id, cpm_amount, cpm_result, cpm_trans_status } = await req.json()

    console.log('Webhook CinetPay reçu:', { cpm_trans_id, cpm_amount, cpm_result, cpm_trans_status })

    // Vérifier la signature du webhook si nécessaire
    const cinetpayApiKey = Deno.env.get('CINETPAY_API_KEY')
    
    // Vérifier le statut de la transaction via l'API CinetPay
    const verificationResponse = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apikey: cinetpayApiKey,
        site_id: Deno.env.get('CINETPAY_SITE_ID'),
        transaction_id: cpm_trans_id
      })
    })

    const verification = await verificationResponse.json()

    if (verification.code !== '00') {
      throw new Error(`Erreur vérification transaction: ${verification.message}`)
    }

    // Mettre à jour la réservation selon le statut - NOUVEAU WORKFLOW
    let bookingStatus = 'initiated'  // Par défaut, garder initiated
    let paymentStatus = 'pending'

    if (cpm_result === '00' && cpm_trans_status === 'ACCEPTED') {
      // ✅ PAIEMENT RÉUSSI - maintenant on bloque réellement le créneau
      bookingStatus = 'confirmed'
      paymentStatus = 'paid'
      console.log('🔥 PAIEMENT CONFIRMÉ - Créneau maintenant bloqué définitivement')
    } else if (cmp_trans_status === 'REFUSED') {
      // ❌ PAIEMENT ÉCHOUÉ - le créneau reste libre
      bookingStatus = 'failed'
      paymentStatus = 'failed'
      console.log('💥 PAIEMENT ÉCHOUÉ - Créneau reste libre pour autres joueurs')
    }

    // Mettre à jour la réservation avec protection contre les double-paiements
    const { data: booking, error: updateError, count } = await supabaseClient
      .from('bookings')
      .update({
        status: bookingStatus,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', cpm_trans_id)
      .eq('status', 'initiated')  // Seules les réservations encore "initiated" peuvent être confirmées
      .eq('payment_status', 'pending')  // Et encore "pending"
      .select('id')  // pour récupérer count
      .single()

    // Vérifier si le paiement a bien mis à jour une réservation
    if (bookingStatus === 'confirmed' && (!booking || count === 0)) {
      console.error('🎯 Paiement reçu mais créneau déjà confirmé, lancer refund automatique')
      console.error('Transaction ID:', cpm_trans_id)
      // TODO: appel API CinetPay refund ou mise en file d'attente
      throw new Error('Payment received but slot already confirmed - refund needed')
    }

    console.log(`✅ Réservation mise à jour: ${booking?.id} → ${bookingStatus}/${paymentStatus}`)

    if (updateError) {
      console.error('Erreur mise à jour réservation:', updateError)
      throw updateError
    }

    // Envoyer l'email de confirmation si paiement réussi
    if (paymentStatus === 'paid' && booking) {
      console.log(`📧 Envoi email de confirmation pour booking ${booking.id}`)
      try {
        await supabaseClient.functions.invoke('send-booking-email', {
          body: {
            booking_id: booking.id,
            notification_type: 'payment_confirmation'
          }
        })
      } catch (emailError) {
        console.error('Erreur envoi email:', emailError)
        // Ne pas faire échouer le webhook pour un problème d'email
      }
    }

    return new Response(
      JSON.stringify({ success: true, booking_id: booking?.id, status: bookingStatus }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Erreur webhook CinetPay:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})