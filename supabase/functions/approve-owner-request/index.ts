import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CinetPayContact {
  prefix: string;
  phone: string;
  name: string;
  surname: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { application_id, notes } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify admin permissions
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Token d\'authentification requis')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Utilisateur non authentifié')
    }

    // Check admin role using the new role system
    if (!await hasRole(user.id, 'super_admin') && 
        !await hasRole(user.id, 'admin_general') && 
        !await hasRole(user.id, 'admin_fields')) {
      throw new Error('Permissions administrateur requises')
    }

    // Helper function to check user roles
    async function hasRole(userId: string, role: string): Promise<boolean> {
      const { data } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', role)
        .eq('is_active', true)
        .maybeSingle()
      return !!data
    }

    // Get the application
    const { data: application, error: appError } = await supabaseAdmin
      .from('owner_applications')
      .select('*')
      .eq('id', application_id)
      .single()

    if (appError || !application) {
      throw new Error('Demande introuvable')
    }

    if (!application.phone_verified_at) {
      throw new Error('Le numéro de téléphone doit être vérifié avant approbation')
    }

    // Start transaction-like operations
    try {
      // 1. Create owner record
      const { data: owner, error: ownerError } = await supabaseAdmin
        .from('owners')
        .insert({
          user_id: application.user_id
        })
        .select()
        .single()

      if (ownerError) {
        throw new Error('Erreur lors de la création du compte propriétaire')
      }

      // 2. Create CinetPay contact
      const contactData: CinetPayContact = {
        prefix: '225',
        phone: application.phone_payout.replace('225', ''),
        name: application.full_name.split(' ')[0] || 'Proprietaire',
        surname: application.full_name.split(' ').slice(1).join(' ') || 'Terrain'
      }

      const cinetpayResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-owner-contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify(contactData)
      })

      const cinetpayResult = await cinetpayResponse.json()
      
      if (!cinetpayResult.success) {
        throw new Error('Erreur lors de la création du contact CinetPay')
      }

      // 3. Create payout account
      const { data: payoutAccount, error: payoutError } = await supabaseAdmin
        .from('payout_accounts')
        .insert({
          owner_id: owner.id,
          label: 'Compte principal',
          phone: application.phone_payout,
          cinetpay_contact_id: cinetpayResult.contact_id,
          is_active: true
        })
        .select()
        .single()

      if (payoutError) {
        throw new Error('Erreur lors de la création du compte de paiement')
      }

      // 4. Set as default payout account
      const { error: updateOwnerError } = await supabaseAdmin
        .from('owners')
        .update({
          default_payout_account_id: payoutAccount.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', owner.id)

      if (updateOwnerError) {
        throw new Error('Erreur lors de la configuration du compte par défaut')
      }

      // 5. Update application status
      const { error: updateAppError } = await supabaseAdmin
        .from('owner_applications')
        .update({
          status: 'approved',
          admin_notes: notes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', application_id)

      if (updateAppError) {
        throw new Error('Erreur lors de la mise à jour de la demande')
      }

      // 6. Grant owner role to user
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: application.user_id,
          role: 'owner',
          granted_by: user.id,
          notes: 'Approved owner application via edge function'
        })
      
      if (roleError && !roleError.message?.includes('duplicate key')) {
        throw new Error('Erreur lors de l\'attribution du rôle propriétaire')
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Demande approuvée avec succès',
          owner_id: owner.id,
          payout_account_id: payoutAccount.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )

    } catch (transactionError) {
      // If any step fails, we should ideally rollback, but for now just throw the error
      throw transactionError
    }

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