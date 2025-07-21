import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('⏰ Programmation du nettoyage automatique des réservations')

    // Programmer l'appel de la fonction de nettoyage toutes les 5 minutes
    const cleanupUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/cleanup-expired-bookings`
    
    // Utiliser pg_cron pour programmer la tâche
    const { error } = await supabaseClient.rpc('sql', {
      query: `
        SELECT cron.schedule(
          'cleanup-expired-bookings',
          '*/5 * * * *', -- Toutes les 5 minutes
          $$
          SELECT net.http_post(
            url := '${cleanupUrl}',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}"}'::jsonb,
            body := '{"scheduled": true}'::jsonb
          ) as request_id;
          $$
        );
      `
    })

    if (error) {
      console.error('❌ Erreur programmation CRON:', error)
      throw error
    }

    console.log('✅ Nettoyage automatique programmé avec succès')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Cleanup scheduled every 5 minutes',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Erreur dans schedule-cleanup:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})