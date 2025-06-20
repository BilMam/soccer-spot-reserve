
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

    console.log('Traitement des tâches d\'automatisation escrow intelligente')

    // Utiliser la nouvelle fonction de traitement intelligent
    const { data: results, error } = await supabaseClient.rpc('process_smart_automation_tasks')

    if (error) {
      console.error('Erreur lors du traitement des tâches:', error)
      throw error
    }

    console.log('Tâches traitées:', results?.length || 0)

    // Traiter les notifications pour les nouvelles tâches
    for (const result of results || []) {
      if (result.task_type === 'auto_confirm' && result.result === 'auto_confirmed') {
        // Notification d'auto-confirmation
        await supabaseClient.functions.invoke('send-booking-email', {
          body: {
            booking_id: result.booking_id,
            notification_type: 'auto_confirmed_express'
          }
        })
      }
      
      if (result.task_type === 'sms_reminder' && result.result === 'sms_reminder_scheduled') {
        // Envoyer SMS de rappel (à implémenter)
        console.log('SMS rappel programmé pour:', result.booking_id)
      }
      
      if (result.task_type === 'support_escalation' && result.result === 'support_escalation_scheduled') {
        // Escalade vers le support
        await supabaseClient.functions.invoke('send-booking-email', {
          body: {
            booking_id: result.booking_id,
            notification_type: 'support_escalation'
          }
        })
      }
      
      if (result.task_type === 'reminder_notification' && result.result === 'reminder_scheduled') {
        // Envoyer notification de rappel au propriétaire
        await supabaseClient.functions.invoke('send-booking-email', {
          body: {
            booking_id: result.booking_id,
            notification_type: 'smart_owner_reminder'
          }
        })
      }
      
      if (result.task_type === 'auto_transfer' && result.result === 'transfer_completed') {
        // Envoyer notification de transfert complété
        await supabaseClient.functions.invoke('send-booking-email', {
          body: {
            booking_id: result.booking_id,
            notification_type: 'transfer_completed'
          }
        })
      }
      
      if (result.task_type === 'auto_refund' && result.result === 'refund_completed') {
        // Envoyer notification de remboursement
        await supabaseClient.functions.invoke('send-booking-email', {
          body: {
            booking_id: result.booking_id,
            notification_type: 'smart_auto_refund_processed'
          }
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        tasks_processed: results?.length || 0,
        results: results 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error: any) {
    console.error('Erreur traitement automatisation escrow intelligente:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
