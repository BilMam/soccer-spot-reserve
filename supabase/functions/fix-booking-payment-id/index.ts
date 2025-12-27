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

    if (!booking_id) {
      throw new Error('booking_id is required');
    }

    console.log('🔧 Fixing booking payment_intent_id for:', booking_id);

    // Generate payment_intent_id for the booking
    const invoiceToken = `invoice_${booking_id}_${Date.now()}`;
    
    // Update booking with payment_intent_id and confirm payment
    const { data: booking, error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        payment_intent_id: invoiceToken,
        status: 'confirmed',
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id)
      .select('id, status, payment_status')
      .single();

    if (updateError) {
      console.error('❌ Error fixing booking:', updateError);
      throw updateError;
    }

    console.log('✅ Booking fixed successfully:', booking);

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking,
        message: 'Booking payment status fixed and slot blocked'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Error in fix-booking-payment-id:', error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
