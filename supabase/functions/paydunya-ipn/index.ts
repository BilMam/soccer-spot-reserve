// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function toHex(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha512(text: string) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-512", data);
  return toHex(buf);
}

serve(async (req) => {
  console.log('🎯 WEBHOOK PAYDUNYA DÉCLENCHÉ!', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    user_agent: req.headers.get('user-agent'),
    content_type: req.headers.get('content-type'),
    origin: req.headers.get('origin'),
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const ct = req.headers.get("content-type") || "";
    let payload: any = {};
    
    try {
      if (ct.includes("application/x-www-form-urlencoded")) {
        payload = Object.fromEntries(new URLSearchParams(await req.text()));
      } else if (ct.includes("application/json")) {
        payload = await req.json();
      } else {
        try { 
          payload = await req.json(); 
        } catch { 
          payload = { raw: await req.text() }; 
        }
      }
    } catch (_) {
      payload = {};
    }

    const master = Deno.env.get("PAYDUNYA_MASTER_KEY") ?? "";
    const receivedHash = (payload.hash || payload.signature || "").toString().toLowerCase();
    const expected = master ? (await sha512(master)).toLowerCase() : "";
    const hashVerified = Boolean(master) && Boolean(receivedHash) && receivedHash === expected;

    console.log("[paydunya-ipn] received", {
      hashVerified,
      contentType: ct,
      keys: Object.keys(payload || {}),
      status: payload?.status,
      token: payload?.token,
      invoice_token: payload?.invoice_token,
    });

    // Extract PayDunya data
    const { status, invoice_token, total_amount } = payload;

    if (!invoice_token) {
      console.error('🚨 AUCUN TOKEN TROUVÉ DANS LE WEBHOOK PayDunya!');
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Determine booking status
    let bookingStatus = 'cancelled';
    let paymentStatus = 'failed';

    const paymentAccepted = status === 'completed';
    if (paymentAccepted) {
      bookingStatus = 'confirmed';
      paymentStatus = 'paid';
      console.log('🔥 PAIEMENT PAYDUNYA CONFIRMÉ - Créneau bloqué définitivement');
    } else {
      console.log('💥 PAIEMENT PAYDUNYA ÉCHOUÉ - Créneau immédiatement libre');
    }

    // Find booking by payment_intent_id (invoice_token)
    const { data: bookingRow } = await supabaseClient
      .from('bookings')
      .select('id, status, payment_status')
      .eq('payment_intent_id', invoice_token)
      .maybeSingle();

    if (!bookingRow) {
      console.error('🚨 AUCUNE RÉSERVATION TROUVÉE POUR CE PAIEMENT PayDunya!');
      console.error('Invoice Token:', invoice_token);
      
      // Log anomaly for monitoring
      await supabaseClient.from('payment_anomalies').insert({
        payment_intent_id: invoice_token,
        amount: parseInt(total_amount || '0'),
        error_type: 'no_booking_found_paydunya',
        error_message: 'No booking found for this PayDunya invoice_token',
        webhook_data: payload
      });
      
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    console.log(`[WEBHOOK] Booking found:`, bookingRow);

    // Update booking
    const { data: booking, error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        status: bookingStatus,
        payment_status: paymentStatus,
        paid_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingRow.id)
      .select('id')
      .single();

    console.log(`✅ Réservation mise à jour: ${booking?.id} → ${bookingStatus}/${paymentStatus}`);

    if (updateError) {
      console.error('Erreur mise à jour réservation:', updateError);
      throw updateError;
    }

    // Trigger automatic payout if payment confirmed
    let payoutTriggered = false;
    if (paymentStatus === 'paid' && booking) {
      console.log(`💰 Déclenchement payout automatique PayDunya pour booking ${booking.id}`);
      try {
        const { data: payoutResult, error: payoutError } = await supabaseClient.functions.invoke('create-paydunya-payout', {
          body: { booking_id: booking.id }
        });

        if (payoutError) {
          console.error('❌ Erreur déclenchement payout PayDunya:', payoutError);
        } else {
          console.log('✅ Payout PayDunya déclenché avec succès:', payoutResult);
          payoutTriggered = true;
        }
      } catch (payoutError) {
        console.error('❌ Erreur payout PayDunya:', payoutError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking_id: booking?.id, 
        status: bookingStatus,
        payout_triggered: payoutTriggered
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ ERREUR WEBHOOK PAYDUNYA CRITIQUE:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Enregistrer l'erreur pour diagnostic
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      
      await supabaseClient.from('payment_anomalies').insert({
        payment_intent_id: 'webhook_error_paydunya',
        amount: 0,
        error_type: 'webhook_processing_error_paydunya',
        error_message: error.message,
        webhook_data: { error_stack: error.stack, timestamp: new Date().toISOString() }
      });
    } catch (logError) {
      console.error('Failed to log PayDunya webhook error:', logError);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
