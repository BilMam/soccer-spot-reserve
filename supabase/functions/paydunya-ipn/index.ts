// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [paydunya-ipn] Function started`);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // Environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const paydunya_master_key = Deno.env.get("PAYDUNYA_MASTER_KEY") ?? "";
    const paydunya_private_key = Deno.env.get('PAYDUNYA_PRIVATE_KEY');
    const paydunya_token = Deno.env.get('PAYDUNYA_TOKEN');

    if (!supabaseUrl || !supabaseServiceKey || !paydunya_master_key || !paydunya_private_key || !paydunya_token) {
      console.error(`[${timestamp}] [paydunya-ipn] Configuration manquante`);
      return new Response("Configuration Error", { status: 500 });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Parse payload
    const ct = req.headers.get("content-type") || "";
    let payload: any = {};
    try {
      if (ct.includes("application/x-www-form-urlencoded")) {
        payload = Object.fromEntries(new URLSearchParams(await req.text()));
      } else if (ct.includes("application/json")) {
        payload = await req.json();
      } else {
        try { payload = await req.json(); } catch { payload = { raw: await req.text() }; }
      }
    } catch (_) {
      payload = {};
    }

    console.log(`[${timestamp}] [paydunya-ipn] Received payload:`, {
      contentType: ct,
      keys: Object.keys(payload || {}),
      status: payload?.status,
      token: payload?.data?.invoice?.token,
      invoice_token: payload?.invoice_token
    });

    // Verify hash (SHA-512 Master Key)
    const receivedHash = (payload.hash || payload.signature || "").toString().toLowerCase();
    const expected = paydunya_master_key ? (await sha512(paydunya_master_key)).toLowerCase() : "";
    const hashValid = Boolean(paydunya_master_key) && Boolean(receivedHash) && receivedHash === expected;

    console.log(`[${timestamp}] [paydunya-ipn] Hash verification:`, { hashValid, receivedHash: !!receivedHash });

    // Extract token from payload (PayDunya sends it in different formats)
    const invoice_token = payload?.data?.invoice?.token || payload?.invoice_token || payload?.token;
    
    if (!invoice_token) {
      console.error(`[${timestamp}] [paydunya-ipn] No invoice token found in payload`);
      return new Response("OK", { status: 200 }); // Still return 200 to avoid retries
    }

    // Get booking from database using payment_intent_id
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('*')
      .eq('payment_intent_id', invoice_token)
      .eq('payment_provider', 'paydunya')
      .single();

    if (bookingError || !booking) {
      console.error(`[${timestamp}] [paydunya-ipn] Booking not found for token:`, invoice_token, bookingError);
      return new Response("OK", { status: 200 });
    }

    console.log(`[${timestamp}] [paydunya-ipn] Found booking:`, booking.id);

    // Call PayDunya API to confirm payment status
    const confirmResponse = await fetch(`https://app.paydunya.com/sandbox-api/v1/checkout-invoice/confirm/${invoice_token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': paydunya_master_key,
        'PAYDUNYA-PRIVATE-KEY': paydunya_private_key,
        'PAYDUNYA-TOKEN': paydunya_token
      }
    });

    if (!confirmResponse.ok) {
      console.error(`[${timestamp}] [paydunya-ipn] Failed to confirm payment:`, confirmResponse.status);
      return new Response("OK", { status: 200 });
    }

    const confirmResult = await confirmResponse.json();
    console.log(`[${timestamp}] [paydunya-ipn] PayDunya confirm response:`, confirmResult);

    // Check if payment is completed
    const isCompleted = confirmResult.response_code === "00" && 
                       (confirmResult.status === "completed" || 
                        confirmResult.invoice?.status === "completed" ||
                        confirmResult.response_data?.status === "completed");

    if (!isCompleted) {
      console.log(`[${timestamp}] [paydunya-ipn] Payment not completed yet:`, confirmResult.status);
      return new Response("OK", { status: 200 });
    }

    // Update booking status (idempotent)
    const { data: updatedBooking, error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking.id)
      .eq('payment_status', 'pending') // Only update if still pending (idempotent)
      .select()
      .single();

    if (updateError && updateError.code !== 'PGRST116') { // PGRST116 = no rows updated (already processed)
      console.error(`[${timestamp}] [paydunya-ipn] Failed to update booking:`, updateError);
      return new Response("OK", { status: 200 });
    }

    if (updatedBooking) {
      console.log(`[${timestamp}] [paydunya-ipn] Booking updated to paid/confirmed:`, updatedBooking.id);

      // Call create-owner-payout if not already sent
      if (!updatedBooking.payout_sent) {
        try {
          console.log(`[${timestamp}] [paydunya-ipn] Calling create-owner-payout for booking:`, updatedBooking.id);
          
          const payoutResponse = await fetch(`${supabaseUrl}/functions/v1/create-owner-payout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              booking_id: updatedBooking.id
            })
          });

          if (payoutResponse.ok) {
            console.log(`[${timestamp}] [paydunya-ipn] Payout created successfully`);
          } else {
            console.error(`[${timestamp}] [paydunya-ipn] Failed to create payout:`, payoutResponse.status);
          }
        } catch (payoutError) {
          console.error(`[${timestamp}] [paydunya-ipn] Error calling create-owner-payout:`, payoutError);
        }
      }
    } else {
      console.log(`[${timestamp}] [paydunya-ipn] Booking already processed (idempotent)`);
    }

    return new Response("OK", {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
    });

  } catch (error) {
    console.error(`[${timestamp}] [paydunya-ipn] Error:`, error);
    return new Response("OK", { 
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
});
