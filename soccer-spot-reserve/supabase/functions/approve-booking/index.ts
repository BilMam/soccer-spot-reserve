
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApproveBookingRequest {
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

    const { booking_id }: ApproveBookingRequest = await req.json()

    console.log('Approbation réservation par propriétaire (Escrow):', { booking_id, user_id: user.id })

    // Vérifier que la réservation existe et appartient à un terrain du propriétaire
    // Accepter les statuts 'pending_approval' ET 'pending'
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        fields!inner(owner_id, name),
        profiles!inner(email, full_name)
      `)
      .eq('id', booking_id)
      .eq('fields.owner_id', user.id)
      .in('status', ['pending_approval', 'pending'])
      .single()

    if (bookingError || !booking) {
      console.error('Erreur booking:', bookingError)
      console.log('Tentative de recherche avec booking_id:', booking_id, 'et owner_id:', user.id)
      throw new Error('Réservation non trouvée ou non autorisée')
    }

    // Générer un token sécurisé pour le lien de paiement
    const paymentToken = crypto.randomUUID() + '-' + Date.now()

    // Mettre à jour la réservation avec le statut approuvé
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id)

    if (updateError) {
      console.error('Erreur mise à jour réservation:', updateError)
      throw updateError
    }

    // Créer un lien de paiement sécurisé
    const { error: linkError } = await supabaseClient
      .from('payment_links')
      .insert({
        booking_id: booking_id,
        token: paymentToken,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48h
      })

    if (linkError) {
      console.error('Erreur création lien paiement:', linkError)
      throw linkError
    }

    // Envoyer email de notification au client avec le lien de paiement escrow
    const paymentUrl = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovableproject.com')}/payment/${paymentToken}`
    
    await supabaseClient.functions.invoke('send-booking-email', {
      body: {
        booking_id: booking.id,
        notification_type: 'booking_approved_escrow',
        payment_url: paymentUrl,
        escrow_info: {
          protection: 'Vos fonds sont protégés et ne seront transférés qu\'après confirmation de votre réservation',
          refund_policy: 'Remboursement automatique si le propriétaire ne confirme pas sous 24h'
        }
      }
    })

    console.log('Réservation approuvée avec système escrow')

    return new Response(
      JSON.stringify({ 
        success: true,
        payment_url: paymentUrl,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        escrow_protection: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error: any) {
    console.error('Erreur approbation réservation escrow:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
