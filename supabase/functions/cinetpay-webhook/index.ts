import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🎯 WEBHOOK CINETPAY DÉCLENCHÉ!', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    user_agent: req.headers.get('user-agent'),
    content_type: req.headers.get('content-type'),
    origin: req.headers.get('origin'),
  })

  if (req.method === 'OPTIONS') {
    console.log('📋 OPTIONS request - CORS preflight')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('📊 CONTENT TYPE:', req.headers.get('content-type'))
    
    // CinetPay envoie les données en form-data, pas en JSON
    let requestBody
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData()
      requestBody = {}
      for (const [key, value] of formData.entries()) {
        requestBody[key] = value
      }
      console.log('📋 FORM DATA PARSED:', requestBody)
    } else if (contentType.includes('application/json')) {
      requestBody = await req.json()
      console.log('📋 JSON DATA:', requestBody)  
    } else {
      // Essayer les deux formats
      try {
        requestBody = await req.json()
      } catch {
        const text = await req.text()
        console.log('📋 RAW TEXT:', text)
        // Parser en form-data manuel si nécessaire
        const params = new URLSearchParams(text)
        requestBody = Object.fromEntries(params)
      }
    }
    const { cpm_trans_id, cpm_amount } = requestBody

    console.log('🎯 WEBHOOK CINETPAY DONNÉES REÇUES!', {
      timestamp: new Date().toISOString(),
      trans_id: cpm_trans_id,
      amount: cpm_amount,
      full_body: requestBody
    })

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

    // Workflow simplifié - plus de statut initiated/pending
    let bookingStatus = 'cancelled'  // Par défaut, annuler la tentative
    let paymentStatus = 'failed'

    const paymentAccepted = verification.code === '00' && verification.data?.status === 'ACCEPTED'
    if (paymentAccepted) {
      // ✅ PAIEMENT RÉUSSI - créneau bloqué définitivement
      bookingStatus = 'confirmed'
      paymentStatus = 'paid'
      console.log('🔥 PAIEMENT CONFIRMÉ - Créneau bloqué définitivement')
    } else {
      // ❌ PAIEMENT ÉCHOUÉ/REFUSÉ - créneau immédiatement libre
      bookingStatus = 'cancelled'
      paymentStatus = 'failed'
      console.log('💥 PAIEMENT ÉCHOUÉ - Créneau immédiatement libre pour autres joueurs')
    }

    // Chercher d'abord la réservation
    const { data: bookingRow } = await supabaseClient
      .from('bookings')
      .select('id, status, payment_status')
      .eq('payment_intent_id', cpm_trans_id)
      .maybeSingle()

    if (!bookingRow) {
      console.error('🚨 AUCUNE RÉSERVATION TROUVÉE POUR CE PAIEMENT!')
      console.error('Transaction ID:', cpm_trans_id)
      
      // Enregistrer l'anomalie pour monitoring
      await supabaseClient.from('payment_anomalies').insert({
        payment_intent_id: cpm_trans_id,
        amount: parseInt(cpm_amount),
        error_type: 'no_booking_found',
        error_message: 'No booking found for this payment_intent_id',
        webhook_data: { cpm_trans_id, cpm_amount }
      })
      
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`[WEBHOOK] Booking found:`, bookingRow)

    // Mettre à jour la réservation (sans filtre de statut strict)
    const { data: booking, error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        status: bookingStatus,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingRow.id)
      .select('id')
      .single()

    console.log(`✅ Réservation mise à jour: ${booking?.id} → ${bookingStatus}/${paymentStatus}`)

    if (updateError) {
      console.error('Erreur mise à jour réservation:', updateError)
      throw updateError
    }

    // Déclencher automatiquement le payout si le paiement est confirmé
    let payoutTriggered = false;
    if (paymentStatus === 'paid' && booking) {
      console.log(`💰 Déclenchement payout automatique pour booking ${booking.id}`)
      try {
        const { data: payoutResult, error: payoutError } = await supabaseClient.functions.invoke('create-owner-payout', {
          body: { booking_id: booking.id }
        });

        if (payoutError) {
          console.error('❌ Erreur déclenchement payout:', payoutError);
        } else {
          console.log('✅ Payout déclenché avec succès:', payoutResult);
          payoutTriggered = true;
        }
      } catch (payoutError) {
        console.error('❌ Erreur payout:', payoutError);
        // Ne pas faire échouer le webhook principal
      }
    }

    // Email de confirmation désactivé - flux automatique silencieux
    // L'utilisateur sera notifié via d'autres canaux si nécessaire

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking_id: booking?.id, 
        status: bookingStatus,
        payout_triggered: payoutTriggered
      }),
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