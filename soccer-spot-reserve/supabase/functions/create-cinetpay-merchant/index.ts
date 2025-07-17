
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MerchantRequest {
  business_name: string;
  owner_name: string;
  phone: string;
  email: string;
  address: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (!user) {
      throw new Error('Utilisateur non authentifié')
    }

    const { business_name, owner_name, phone, email, address }: MerchantRequest = await req.json()

    // Pour CinetPay, on simule la création d'un compte marchand
    // Dans un vrai scénario, vous devriez intégrer l'API de création de compte marchand CinetPay
    const merchantId = `merchant_${user.id.substring(0, 8)}_${Date.now()}`

    // Créer ou mettre à jour le compte de paiement
    const { data: paymentAccount, error: accountError } = await supabaseClient
      .from('payment_accounts')
      .upsert({
        owner_id: user.id,
        external_account_id: merchantId,
        merchant_id: merchantId,
        payment_provider: 'cinetpay',
        account_status: 'pending',
        account_type: 'merchant',
        details_submitted: true,
        charges_enabled: false,
        payouts_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'owner_id,payment_provider'
      })
      .select()
      .single()

    if (accountError) {
      console.error('Erreur création compte:', accountError)
      throw accountError
    }

    // Mettre à jour le profil utilisateur
    await supabaseClient
      .from('profiles')
      .update({
        cinetpay_onboarding_completed: true,
        cinetpay_account_verified: false, // Sera vérifié manuellement ou via webhook
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    return new Response(
      JSON.stringify({
        merchant_id: merchantId,
        status: 'pending',
        message: 'Compte marchand CinetPay créé avec succès. Vérification en cours.',
        onboarding_url: null // CinetPay n'a pas d'URL d'onboarding comme Stripe
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Erreur création compte marchand:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
