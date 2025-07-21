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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('🧹 Démarrage nettoyage automatique des réservations expirées')

    // Appeler la fonction de nettoyage
    const { error } = await supabaseClient.rpc('cleanup_expired_bookings')

    if (error) {
      console.error('❌ Erreur lors du nettoyage:', error)
      throw error
    }

    // Compter les réservations nettoyées
    const { data: cleanedBookings } = await supabaseClient
      .from('bookings')
      .select('id, created_at')
      .eq('status', 'expired')
      .eq('payment_status', 'expired')
      .gte('updated_at', new Date(Date.now() - 2 * 60 * 1000).toISOString()) // Dernières 2 minutes

    const cleanedCount = cleanedBookings?.length || 0

    console.log(`✅ Nettoyage terminé: ${cleanedCount} réservation(s) expirée(s)`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        cleaned_bookings: cleanedCount,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Erreur dans cleanup-expired-bookings:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})