import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      console.log('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user.id
    const body = await req.json()

    console.log('Creating field for user:', userId)
    console.log('Field data:', body)

    // Récupérer ou créer l'owner record
    let { data: owner, error: ownerError } = await supabase
      .from('owners')
      .select('id, default_payout_account_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (ownerError) {
      console.error('Error fetching owner:', ownerError)
      return new Response(
        JSON.stringify({ error: 'Error fetching owner data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Si l'owner n'existe pas, le créer
    if (!owner) {
      const { data: newOwner, error: createOwnerError } = await supabase
        .from('owners')
        .insert({ user_id: userId })
        .select('id, default_payout_account_id')
        .single()

      if (createOwnerError) {
        console.error('Error creating owner:', createOwnerError)
        return new Response(
          JSON.stringify({ error: 'Error creating owner record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      owner = newOwner
    }

    // Récupérer les comptes de paiement actifs de l'utilisateur
    const { data: payoutAccounts, error: payoutError } = await supabase
      .from('payout_accounts')
      .select('id')
      .eq('owner_id', owner.id)
      .eq('is_active', true)

    if (payoutError) {
      console.error('Error fetching payout accounts:', payoutError)
      return new Response(
        JSON.stringify({ error: 'Error fetching payout accounts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Déterminer le payout_account_id à utiliser
    let payoutAccountId = body.payout_account_id

    if (!payoutAccountId) {
      // Aucun ID passé → utiliser le compte par défaut
      payoutAccountId = owner.default_payout_account_id
    }

    // Validation : vérifier que le compte appartient bien à l'owner
    if (payoutAccountId && !payoutAccounts?.find(account => account.id === payoutAccountId)) {
      return new Response(
        JSON.stringify({ error: 'Le compte de paiement sélectionné est invalide ou inactif' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Créer le terrain
    const fieldData = {
      name: body.name,
      description: body.description,
      location: body.location,
      address: body.address,
      city: body.city,
      field_type: body.field_type,
      capacity: body.capacity,
      price_per_hour: body.price_per_hour,
      availability_start: body.availability_start,
      availability_end: body.availability_end,
      amenities: body.amenities || [],
      images: body.images || [],
      latitude: body.latitude,
      longitude: body.longitude,
      owner_id: userId,
      payout_account_id: payoutAccountId,
      is_active: false // Les terrains doivent être approuvés
    }

    const { data: field, error: fieldError } = await supabase
      .from('fields')
      .insert(fieldData)
      .select()
      .single()

    if (fieldError) {
      console.error('Error creating field:', fieldError)
      return new Response(
        JSON.stringify({ error: 'Error creating field: ' + fieldError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Field created successfully:', field)

    return new Response(
      JSON.stringify({ success: true, field }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-field function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})