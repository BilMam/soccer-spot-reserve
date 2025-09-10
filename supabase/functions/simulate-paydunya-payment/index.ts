// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🧪 SIMULATE PAYDUNYA PAYMENT STARTED');

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { booking_id } = await req.json();

    if (!booking_id) {
      return new Response("booking_id required", { status: 400, headers: corsHeaders });
    }

    // Get booking details
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: booking } = await supabaseClient
      .from('bookings')
      .select('payment_intent_id, total_price, id')
      .eq('id', booking_id)
      .maybeSingle();

    if (!booking || !booking.payment_intent_id) {
      return new Response("Booking not found or no payment_intent_id", { status: 404, headers: corsHeaders });
    }

    console.log('🎯 Found booking:', booking);

    // Simulate PayDunya IPN payload - using the exact structure from logs
    const simulatedPayload = {
      "data[response_code]": "00",
      "data[response_text]": "Transaction Found",
      "data[hash]": "de60b103370c41db9fe3b7f034dab30750b4d9d4f147bf35c3ea99b993df107735eb362328db21ff1555d3a9cbe4bd3c7bca3dc8b5aa23709813a6e71238327d",
      "data[invoice][token]": "simulated_paydunya_token",
      "data[invoice][pal_is_on]": "0",
      "data[invoice][total_amount]": booking.total_price.toString(),
      "data[invoice][total_amount_without_fees]": booking.total_price.toString(),
      "data[invoice][description]": "Réservation MySport - Test Simulation",
      "data[invoice][expire_date]": new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      "data[custom_data][booking_id]": booking.id,
      "data[custom_data][user_id]": "test-user-id",
      "data[custom_data][invoice_token]": booking.payment_intent_id, // ✅ Le token correct que notre système utilise
      "data[actions][cancel_url]": "https://test.com/cancel",
      "data[actions][callback_url]": "https://test.com/callback", 
      "data[actions][return_url]": "https://test.com/return",
      "data[mode]": "test",
      "data[status]": "completed", // ✅ Paiement réussi
      "data[fail_reason]": "",
      "data[customer][name]": "Test Customer",
      "data[customer][phone]": "0700000000",
      "data[customer][email]": "test@example.com",
      "data[customer][payment_method]": "wave-ci",
      "data[receipt_identifier]": "TEST-RECEIPT-123",
      "data[receipt_url]": "https://test.com/receipt.pdf",
      "data[provider_reference]": "test-provider-ref"
    };

    console.log('📤 Sending simulated payload to paydunya-ipn:', simulatedPayload);

    // Call our PayDunya IPN endpoint
    const ipnUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/paydunya-ipn`;
    
    const ipnResponse = await fetch(ipnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: new URLSearchParams(simulatedPayload).toString()
    });

    const ipnResult = await ipnResponse.text();
    console.log('📥 IPN Response Status:', ipnResponse.status);
    console.log('📥 IPN Response Body:', ipnResult);

    // Check if booking was updated
    const { data: updatedBooking } = await supabaseClient
      .from('bookings')
      .select('payment_status, status, paid_at')
      .eq('id', booking_id)
      .maybeSingle();

    console.log('🔍 Updated booking status:', updatedBooking);

    return new Response(
      JSON.stringify({ 
        success: true,
        original_booking: booking,
        simulated_payload: simulatedPayload,
        ipn_response_status: ipnResponse.status,
        ipn_response_body: ipnResult,
        updated_booking: updatedBooking,
        test_result: updatedBooking?.payment_status === 'paid' ? '✅ SUCCESS' : '❌ FAILED'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ SIMULATION ERROR:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});