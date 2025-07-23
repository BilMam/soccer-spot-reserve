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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

    // Parse request data dynamically (CinetPay sends JSON or form-urlencoded)
    let params: URLSearchParams;
    const contentType = req.headers.get('content-type') || '';
    console.log('📋 Content-Type:', contentType);
    
    if (contentType.includes('application/json')) {
      const jsonBody = await req.json();
      console.log('📋 Received JSON body:', jsonBody);
      params = new URLSearchParams();
      Object.entries(jsonBody).forEach(([key, value]) => {
        params.set(key, String(value));
      });
    } else {
      const bodyText = await req.text();
      console.log('📋 Received form-urlencoded body:', bodyText);
      params = new URLSearchParams(bodyText);
    }
    
    const cpm_trans_id = params.get('cpm_trans_id')
    const cpm_amount = params.get('cpm_amount')  
    const cpm_result = params.get('cpm_result')
    const cpm_trans_status = params.get('cpm_trans_status')

    console.log('🔍 Webhook CinetPay reçu - cpm_trans_id:', cpm_trans_id)
    console.log('Webhook CinetPay reçu:', { cpm_trans_id, cpm_amount, cpm_result, cpm_trans_status })

    // -----------------------------------------------------------------------------
    // ⚡ Skip CinetPay API when testing locally
    //    (mettre SKIP_CINETPAY_VERIFY=true dans .env.local)
    // -----------------------------------------------------------------------------
    const SKIP_CINETPAY_VERIFY = Deno.env.get('SKIP_CINETPAY_VERIFY') === 'true';

    let verification: any = null;
    
    if (!SKIP_CINETPAY_VERIFY) {
      // ==== Vérification réelle (URL sans espaces) ==========================
      const cinetpayApiKey = Deno.env.get('CINETPAY_API_KEY')
      
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

      verification = await verificationResponse.json()
      console.log('[DEBUG] Verification response', verification);

      if (verification.code !== '00') {
        throw new Error(`Erreur vérification transaction: ${verification.message}`)
      }
    } else {
      console.log('[LOCAL] Skip CinetPay verification ✅');
      // Mode test local - simuler une réponse valide
      verification = {
        code: '00',
        data: { status: cpm_trans_status || 'ACCEPTED' }
      };
    }

    // Debug: vérifier les lignes existantes AVANT update
    const { data: before } = await supabaseClient
      .from('bookings')
      .select('id, status, payment_status')
      .eq('payment_intent_id', cpm_trans_id);
    console.log('👉 Rows BEFORE update:', before);

    // Mettre à jour la réservation selon la vérification CinetPay
    const paymentAccepted = verification?.code === '00' && verification?.data?.status === 'ACCEPTED';
    
    let bookingStatus = 'provisional'
    let paymentStatus = 'pending'

    if (paymentAccepted) {
      bookingStatus = 'confirmed'
      paymentStatus = 'paid'
      console.log('✅ PAIEMENT CONFIRMÉ - Créneau bloqué définitivement')
    } else if (verification?.data?.status === 'REFUSED') {
      bookingStatus = 'cancelled'
      paymentStatus = 'failed'
      console.log('❌ PAIEMENT REFUSÉ - Créneau libre pour autres joueurs')
    } else {
      bookingStatus = 'cancelled'
      paymentStatus = 'failed'
      console.log('💥 PAIEMENT ÉCHOUÉ - Statut:', verification?.data?.status)
    }

    // Préparer les champs de mise à jour avec idempotence
    const updateFields: any = {
      status: bookingStatus,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    };
    
    // Renseigner paid_at si paiement validé
    if (paymentStatus === 'paid') {
      updateFields.paid_at = new Date().toISOString();
    }

    // Mise à jour avec gestion d'idempotence (supprimer filtres restrictifs)
    const { data: booking, error: updateError, count } = await supabaseClient
      .from('bookings')
      .update(updateFields)
      .eq('payment_intent_id', cpm_trans_id)
      .select(`
        id, status, payment_status, paid_at, updated_at,
        profiles!inner(email, full_name),
        fields!inner(name, location)
      `)
      .single()

    console.log('💡 Updated rows count:', count)

    if (updateError) {
      console.error('Erreur mise à jour réservation:', updateError)
      throw updateError
    }

    // Si aucune ligne mise à jour, investiguer
    if (!booking) {
      console.error('❌ ANOMALIE: Aucune réservation trouvée pour payment_intent_id:', cpm_trans_id)
      
      // Chercher toute réservation avec ce payment_intent_id
      const { data: allWithId } = await supabaseClient
        .from('bookings')
        .select('id, status, payment_status, payment_intent_id')
        .eq('payment_intent_id', cpm_trans_id);
      
      console.log('🔍 All bookings with this payment_intent_id:', allWithId)
      
      // Chercher les réservations récentes qui pourraient correspondre
      const { data: recentBookings } = await supabaseClient
        .from('bookings')
        .select('id, status, payment_status, payment_intent_id, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // 30 min
        .order('created_at', { ascending: false })
        .limit(10);
      
      console.log('📋 Recent bookings (last 30min):', recentBookings)
      
      await supabaseClient
        .from('payment_anomalies')
        .insert({
          payment_intent_id: cpm_trans_id,
          amount: cpm_amount,
          error_type: 'no_row_matched',
          error_message: 'Aucune réservation trouvée avec ce payment_intent_id',
          webhook_data: { params: Object.fromEntries(params) }
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