import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`🎯 [${timestamp}] Webhook CinetPay déclenché — ${req.method}`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const cinetpayApiKey = Deno.env.get('CINETPAY_API_KEY');
    const cinetpaySiteId = Deno.env.get('CINETPAY_SITE_ID');

    // =======================
    // 🔍 Parsing flexible du corps
    // =======================
    const contentType = req.headers.get('content-type') || '';
    let body: Record<string, any> = {};

    if (contentType.includes('application/json')) {
      body = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) body[key] = value;
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        const params = new URLSearchParams(text);
        body = Object.fromEntries(params);
      }
    }

    console.log('📦 Données reçues du webhook:', body);

    const transactionId =
      body.transaction_id || body.cpm_trans_id || body?.data?.transaction_id;
    if (!transactionId) throw new Error('transaction_id manquant dans le webhook');

    // =======================
    // 🔒 Vérification côté serveur
    // =======================
    const checkPayload = {
      apikey: cinetpayApiKey,
      site_id: cinetpaySiteId,
      transaction_id: transactionId,
    };

    const checkResponse = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkPayload),
    });

    const checkData = await checkResponse.json();
    console.log('🧾 Réponse /payment/check:', checkData);

    const status = (checkData?.data?.status || '').toUpperCase();
    const code = checkData?.code;

    // =======================
    // 🧠 Détermination du statut réel
    // =======================
    let bookingStatus = 'pending';
    let paymentStatus = 'pending';

    if (code === '00' && status === 'ACCEPTED') {
      bookingStatus = 'confirmed';
      paymentStatus = 'paid';
    } else if (status === 'REFUSED' || code === '201') {
      bookingStatus = 'cancelled';
      paymentStatus = 'failed';
    } else if (status === 'PENDING') {
      bookingStatus = 'pending';
      paymentStatus = 'pending';
    }

    // =======================
    // 🔍 Recherche de la réservation associée
    //  (et récupération des infos nécessaires au payout planifié)
    // =======================
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        payment_status,
        owner_amount,
        start_time,
        fields!inner (
          name,
          owners!inner ( id, cinetpay_contact_id )
        )
      `)
      .eq('payment_intent_id', transactionId)
      .maybeSingle();

    if (bookingErr) throw bookingErr;

    if (!booking) {
      console.warn('⚠️ Aucune réservation trouvée pour transaction:', transactionId);
      await supabase.from('payment_anomalies').insert({
        payment_intent_id: transactionId,
        error_type: 'no_booking_found',
        error_message: 'No booking found for this transaction_id',
        webhook_data: body,
      });

      return new Response(
        JSON.stringify({ success: false, reason: 'booking_not_found' }),
        { headers: corsHeaders, status: 200 }
      );
    }

    // =======================
    // 💾 Mise à jour de la réservation
    // =======================
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: bookingStatus,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    if (updateError) throw updateError;

    console.log(`✅ Réservation ${booking.id} mise à jour → ${bookingStatus}/${paymentStatus}`);

    // =======================
    // 🗓️ PLANIFICATION AUTOMATIQUE DU PAYOUT
    // =======================
    let payoutPlanned = false;
    let payoutTriggeredNow = false;

    if (paymentStatus === 'paid') {
      // vérifs de base
      const ownerAmount = Math.round(Number(booking.owner_amount) || 0);
      const contactId: string | null = booking.fields?.owners?.cinetpay_contact_id ?? null;
      if (!ownerAmount) {
        console.warn('⚠️ owner_amount invalide ou nul, pas de payout créé');
      } else if (!contactId) {
        console.warn('⚠️ cinetpay_contact_id manquant pour le propriétaire, pas de payout créé');
      } else {
        // Idempotence : existe-t-il déjà un payout pour cette booking ?
        const { data: existingPayout } = await supabase
          .from('payouts')
          .select('id, status, scheduled_at')
          .eq('booking_id', booking.id)
          .maybeSingle();

        const scheduledAtIso = new Date(booking.start_time).toISOString(); // ⚠️ supposé déjà en UTC
        const now = new Date();
        const start = new Date(scheduledAtIso);

        if (!existingPayout) {
          const { error: insErr } = await supabase.from('payouts').insert({
            booking_id: booking.id,
            owner_id: booking.fields.owners.id,
            amount: ownerAmount,
            amount_net: ownerAmount,
            status: 'scheduled',
            scheduled_at: scheduledAtIso
          });
          if (insErr) throw new Error('Failed to schedule payout: ' + insErr.message);
          payoutPlanned = true;
          console.log(`🗓️ Payout planifié pour ${scheduledAtIso} (XOF ${ownerAmount})`);
        } else if (existingPayout.status === 'pending') {
          await supabase.from('payouts').update({
            status: 'scheduled',
            scheduled_at: scheduledAtIso
          }).eq('id', existingPayout.id);
          payoutPlanned = true;
          console.log(`🗓️ Payout existant basculé en scheduled → ${scheduledAtIso}`);
        } else {
          console.log(`ℹ️ Payout déjà présent (status=${existingPayout.status})`);
        }

        // 🟢 Si l’heure est déjà passée (ou très proche), déclencher tout de suite
        if (start.getTime() <= now.getTime()) {
          try {
            const { data: payoutResult, error: payoutError } = await supabase.functions.invoke(
              'create-owner-payout',
              { body: { booking_id: booking.id } }
            );
            if (payoutError) {
              console.error('Erreur lors du payout immédiat:', payoutError);
            } else {
              payoutTriggeredNow = true;
              console.log('💸 Payout immédiat exécuté (heure déjà passée):', payoutResult);
            }
          } catch (err) {
            console.error('Erreur invocation payout immédiat:', err);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transactionId,
        booking_id: booking.id,
        status: bookingStatus,
        payment_status: paymentStatus,
        payout_planned: payoutPlanned,
        payout_triggered_now: payoutTriggeredNow
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Erreur critique dans le webhook CinetPay:', error);

    // Log en base pour analyse
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabase.from('payment_anomalies').insert({
        payment_intent_id: 'webhook_error',
        error_type: 'webhook_processing_error',
        error_message: error.message,
        webhook_data: { stack: error.stack, time: new Date().toISOString() },
      });
    } catch (err) {
      console.error('Échec enregistrement erreur webhook:', err);
    }

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
