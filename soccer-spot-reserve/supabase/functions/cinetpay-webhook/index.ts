
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

    console.log('🔍 Webhook CinetPay reçu - cpm_trans_id:', cpm_trans_id)
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

    // Debug: vérifier les lignes existantes AVANT update
    const { data: before } = await supabaseClient
      .from('bookings')
      .select('id, status, payment_status')
      .eq('payment_intent_id', cpm_trans_id);
    console.log('👉 Rows BEFORE update:', before);

    // Mettre à jour la réservation selon le statut
    let bookingStatus = 'provisional'
    let paymentStatus = 'pending'

    if (cpm_result === '00' && cpm_trans_status === 'ACCEPTED') {
      bookingStatus = 'confirmed'
      paymentStatus = 'paid'
    } else if (cpm_trans_status === 'REFUSED') {
      bookingStatus = 'cancelled'
      paymentStatus = 'failed'
    }

    // TEMP: Filtre élargi pour debug
    const { data: booking, error: updateError, count } = await supabaseClient
      .from('bookings')
      .update({
        status: bookingStatus,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('payment_intent_id', cpm_trans_id)
      .in('status', ['provisional', 'pending', 'cancelled'])
      .in('payment_status', ['pending', 'processing', 'failed'])
      .select(`
        *,
        profiles!inner(email, full_name),
        fields!inner(name, location)
      `)
      .single()

    console.log('💡 Updated rows count:', count)

    if (updateError) {
      console.error('Erreur mise à jour réservation:', updateError)
      throw updateError
    }

    // Si aucune ligne mise à jour, logger l'anomalie
    if (count === 0) {
      console.error('❌ ANOMALIE: Aucune réservation trouvée pour payment_intent_id:', cpm_trans_id)
      
      await supabaseClient
        .from('payment_anomalies')
        .insert({
          payment_intent_id: cpm_trans_id,
          amount: cpm_amount,
          error_type: 'no_row_matched',
          error_message: 'Aucune réservation trouvée avec ce payment_intent_id',
          webhook_data: { cpm_trans_id, cpm_amount, cpm_result, cpm_trans_status }
        })

      throw new Error('Aucune réservation trouvée')
    }

    console.log(`✅ Réservation mise à jour: ${booking.id} → ${bookingStatus}/${paymentStatus}`)

    // Envoyer l'email de confirmation si paiement réussi
    if (paymentStatus === 'paid' && booking) {
      await supabaseClient.functions.invoke('send-booking-email', {
        body: {
          booking_id: booking.id,
          notification_type: 'payment_confirmation'
        }
      })
    }

    return new Response(
      JSON.stringify({ success: true }),
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
