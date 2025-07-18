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
    const { phone, token } = await req.json()

    if (!phone || !token) {
      throw new Error('Téléphone et code OTP requis')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Token d\'authentification requis')
    }

    const authToken = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authToken)
    
    if (userError || !user) {
      throw new Error('Utilisateur non authentifié')
    }

    // Verify OTP via Supabase Auth
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      phone: `+${phone}`,
      token,
      type: 'sms'
    })

    if (error) {
      console.error('OTP verification error:', error)
      throw new Error('Code OTP invalide ou expiré')
    }

    // Update owner application to mark phone as verified
    const { error: updateError } = await supabaseAdmin
      .from('owner_applications')
      .update({ 
        phone_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('phone_payout', phone)
      .eq('status', 'pending')

    if (updateError) {
      console.error('Application update error:', updateError)
      throw new Error('Erreur lors de la mise à jour de la demande')
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Numéro de téléphone vérifié avec succès'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})