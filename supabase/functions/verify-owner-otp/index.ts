
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

    // Client admin pour les opérations serveur (bypasse RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Client séparé pour vérifier l'authentification utilisateur
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Token d\'authentification requis')
    }

    const authToken = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(authToken)
    
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

    console.log('🔄 OTP vérifié avec succès, vérification propriétaire...')

    // 1) Vérifier si l'owner existe déjà
    const { data: existingOwner, error: ownerCheckError } = await supabaseAdmin
      .from('owners')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (ownerCheckError) {
      console.error('Erreur vérification propriétaire:', ownerCheckError)
      throw new Error('Impossible de vérifier le compte propriétaire')
    }

    let ownerId: string
    let ownerCreated = false

    if (existingOwner) {
      ownerId = existingOwner.id
      console.log('👤 Owner already exists, skipping creation:', ownerId)
    } else {
      console.log('📝 Création nouveau propriétaire...')
      const { data: newOwner, error: createOwnerError } = await supabaseAdmin
        .from('owners')
        .insert({ user_id: user.id })
        .select()
        .single()
      
      if (createOwnerError) {
        console.error('Erreur création propriétaire:', createOwnerError)
        throw new Error('Impossible de créer le compte propriétaire')
      }
      ownerId = newOwner.id
      ownerCreated = true
      console.log('✅ Owner created:', ownerId)
    }

    // Récupérer les infos utilisateur pour create-owner-contact
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('Erreur récupération profil:', profileError)
      throw new Error('Impossible de récupérer les informations utilisateur')
    }

    // Séparer le nom en prénom et nom de famille
    const nameParts = userProfile.full_name?.split(' ') || ['Propriétaire']
    const owner_name = nameParts[0] || 'Propriétaire'
    const owner_surname = nameParts.slice(1).join(' ') || 'MySport'

    // Nettoyer le numéro de téléphone (retirer le +225 si présent)
    const cleanPhone = phone.replace(/^\+?225/, '')

    // 2) Appeler create-owner-contact pour CinetPay
    console.log('🔄 Création contact CinetPay...')
    const { data: contactResponse, error: contactError } = await supabaseAdmin.functions.invoke(
      'create-owner-contact',
      {
        body: {
          owner_id: ownerId,
          owner_name,
          owner_surname,
          phone: cleanPhone,
          email: userProfile.email,
          country_prefix: '225'
        }
      }
    )

    if (contactError) {
      console.error('Erreur création contact CinetPay:', contactError)
      // On continue même si CinetPay échoue
    } else {
      console.log('✅ Contact CinetPay créé:', contactResponse)
    }

    // 3) Créer le compte de paiement par défaut
    console.log('🔄 Création compte de paiement par défaut...')
    const { data: payoutAccount, error: payoutError } = await supabaseAdmin
      .from('payout_accounts')
      .insert({
        owner_id: ownerId,
        label: 'Compte principal',
        phone: cleanPhone,
        is_active: true
      })
      .select()
      .single()
    
    if (payoutError) {
      console.error('Erreur création compte paiement:', payoutError)
      throw new Error('Impossible de créer le compte de paiement')
    }
    console.log('✅ Compte de paiement créé:', payoutAccount.id)

    // 4) Mettre à jour le compte par défaut du propriétaire
    const { error: updateOwnerError } = await supabaseAdmin
      .from('owners')
      .update({ 
        default_payout_account_id: payoutAccount.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', ownerId)

    if (updateOwnerError) {
      console.error('Erreur mise à jour propriétaire:', updateOwnerError)
    }

    // 5) Marquer la demande comme vérifiée dans owner_applications
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

    // 6) Mettre à jour le type d'utilisateur dans profiles
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ user_type: 'owner' })
      .eq('id', user.id)

    if (profileUpdateError) {
      console.error('Erreur mise à jour profil:', profileUpdateError)
    }

    console.log('🎉 Processus complet terminé avec succès!')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: ownerCreated ? 'Numéro vérifié et compte propriétaire créé avec succès' : 'Compte de paiement ajouté avec succès',
        owner_id: ownerId,
        owner_created: ownerCreated,
        payout_account: payoutAccount
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
