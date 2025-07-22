import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔧 FORCE CONFIRM BOOKING')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { booking_id } = await req.json()
    
    console.log('📝 Force confirming booking:', booking_id)

    // Forcer la confirmation de la réservation
    const { data: booking, error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating booking:', updateError)
      throw updateError
    }

    console.log('✅ Booking confirmed:', booking)

    return new Response(
      JSON.stringify({ success: true, booking }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})