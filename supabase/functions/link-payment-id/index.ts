import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { booking_id, payment_intent_id } = await req.json()

    if (!booking_id || !payment_intent_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id and payment_intent_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔗 Linking payment_intent_id:', { booking_id, payment_intent_id })

    // Mettre à jour avec les privilèges service_role
    const { data, error } = await supabaseClient
      .from('bookings')
      .update({ payment_intent_id })
      .eq('id', booking_id)
      .select('id, payment_intent_id')
      .single()

    if (error) {
      console.error('❌ Erreur liaison payment_intent_id:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ payment_intent_id lié avec succès:', data)

    return new Response(
      JSON.stringify({ success: true, booking: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur link-payment-id:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})