import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { booking_id } = await req.json();

    console.log('🔧 Simulating PayDunya payment for booking:', booking_id);

    // Generate invoice_token like PayDunya would
    const invoiceToken = `invoice_${booking_id}_${Date.now()}`;

    // First, update with payment_intent_id
    const { error: linkError } = await supabaseClient
      .from('bookings')
      .update({ payment_intent_id: invoiceToken })
      .eq('id', booking_id);

    if (linkError) {
      console.error('❌ Error linking payment_intent_id:', linkError);
      throw linkError;
    }

    console.log('✅ Payment intent linked:', invoiceToken);

    // Then confirm the payment (simulate webhook)
    const { data: booking, error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id)
      .select('id, status, payment_status')
      .single();

    if (updateError) {
      console.error('❌ Error confirming payment:', updateError);
      throw updateError;
    }

    console.log('✅ Payment confirmed - slot blocked:', booking);

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking,
        invoice_token: invoiceToken,
        message: 'Payment simulated successfully - slot is now blocked'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Error simulating payment:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});