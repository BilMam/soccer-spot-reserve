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
    const { phone_payout } = await req.json()

    if (!phone_payout) {
      throw new Error('Numéro de téléphone requis')
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

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Utilisateur non authentifié')
    }

    // Clean phone number (remove spaces, special chars)
    const cleanPhone = phone_payout.replace(/[^\d]/g, '')
    
    // Format for Ivory Coast if needed
    const formattedPhone = cleanPhone.startsWith('225') ? cleanPhone : `225${cleanPhone}`

    // Vérifie / crée l'utilisateur puis envoie l'OTP
    const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
      phone: `+${formattedPhone}`,
      options: { shouldCreateUser: true }   // crée le user si absent
    })

    if (otpError) {
      console.error('SMS OTP error:', otpError)
      throw new Error('Impossible d\'envoyer le code OTP')
    }

    // Store the phone number temporarily in the application
    const { error: updateError } = await supabaseAdmin
      .from('owner_applications')
      .update({ 
        phone_payout: formattedPhone,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('status', 'pending')

    if (updateError) {
      console.error('Application update error:', updateError)
      throw new Error('Erreur lors de la mise à jour de la demande')
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OTP envoyé avec succès',
        phone: formattedPhone,
        provider: 'twilio'
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