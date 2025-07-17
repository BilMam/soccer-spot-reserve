
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConfirmBookingRequest {
  booking_id: string;
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

    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (!user) {
      throw new Error('Utilisateur non authentifié')
    }

    const { booking_id }: ConfirmBookingRequest = await req.json()

    console.log('Confirmation réservation par propriétaire:', { booking_id, user_id: user.id })

    // Utiliser la fonction de confirmation
    const { data: success, error } = await supabaseClient.rpc('confirm_booking_by_owner', {
      p_booking_id: booking_id,
      p_owner_id: user.id
    })

    if (error || !success) {
      console.error('Erreur confirmation réservation:', error)
      throw new Error('Impossible de confirmer cette réservation')
    }

    // Envoyer notification de confirmation au client
    await supabaseClient.functions.invoke('send-booking-email', {
      body: {
        booking_id: booking_id,
        notification_type: 'booking_confirmed_by_owner'
      }
    })

    console.log('Réservation confirmée avec succès - transfert programmé')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Réservation confirmée. Le transfert sera effectué sous 5 minutes.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error: any) {
    console.error('Erreur confirmation réservation:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
