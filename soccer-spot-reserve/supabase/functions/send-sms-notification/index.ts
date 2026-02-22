
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    const { userId, bookingId, messageType, phoneNumber, content } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Ici vous pourriez intégrer avec un service SMS réel
    // Par exemple Twilio, Orange SMS API, etc.
    console.log('SMS à envoyer:', {
      to: phoneNumber,
      message: content,
      type: messageType
    })

    // Simuler l'envoi SMS (remplacer par vraie intégration)
    const smsSuccess = true // Remplacer par la réponse du service SMS
    
    // Enregistrer la notification SMS dans la base
    const { error: insertError } = await supabaseClient
      .from('sms_notifications')
      .insert({
        user_id: userId,
        booking_id: bookingId,
        phone_number: phoneNumber,
        message_type: messageType,
        content: content,
        status: smsSuccess ? 'sent' : 'failed',
        sent_at: smsSuccess ? new Date().toISOString() : null,
        error_message: smsSuccess ? null : 'Service SMS non configuré'
      })

    if (insertError) {
      throw insertError
    }

    return new Response(
      JSON.stringify({ 
        success: smsSuccess,
        message: smsSuccess ? 'SMS envoyé avec succès' : 'Erreur envoi SMS'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
