
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

    const webhookData = await req.json()
    console.log('Webhook CinetPay Escrow reçu:', webhookData)

    const { cpm_trans_id, cpm_trans_status, cpm_amount, signature } = webhookData

    // Vérifier la signature (sécurité)
    const cinetpayApiKey = Deno.env.get('CINETPAY_API_KEY')
    if (!cinetpayApiKey) {
      throw new Error('Clé API CinetPay manquante')
    }

    // Récupérer la réservation
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('*')
      .eq('cinetpay_transaction_id', cpm_trans_id)
      .single()

    if (bookingError || !booking) {
      console.error('Réservation non trouvée:', bookingError)
      throw new Error('Réservation non trouvée')
    }

    console.log('Réservation trouvée:', booking.id)

    if (cpm_trans_status === 'ACCEPTED' || cpm_trans_status === '1') {
      // Paiement accepté - Mettre les fonds en escrow
      console.log('Paiement accepté - Mise en escrow des fonds')

      // Créer la transaction d'escrow
      const { data: escrowTransaction, error: escrowError } = await supabaseClient
        .rpc('process_escrow_transaction', {
          p_booking_id: booking.id,
          p_transaction_type: 'payment_received',
          p_amount: booking.total_price,
          p_cinetpay_transaction_id: cpm_trans_id,
          p_platform_fee: booking.platform_fee || 0
        })

      if (escrowError) {
        console.error('Erreur création transaction escrow:', escrowError)
        throw escrowError
      }

      // Mettre à jour le statut de la réservation
      const { error: updateError } = await supabaseClient
        .from('bookings')
        .update({
          payment_status: 'paid',
          status: 'confirmed', // Réservation confirmée côté client
          escrow_status: 'funds_held', // Fonds en attente chez la plateforme
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)

      if (updateError) {
        console.error('Erreur mise à jour réservation:', updateError)
        throw updateError
      }

      // Envoyer notification au propriétaire pour qu'il confirme
      await supabaseClient.functions.invoke('send-booking-email', {
        body: {
          booking_id: booking.id,
          notification_type: 'owner_confirmation_required',
          escrow_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      })

      console.log('Fonds mis en escrow avec succès - Notification propriétaire envoyée')

    } else if (cpm_trans_status === 'DECLINED' || cmp_trans_status === '0') {
      // Paiement refusé
      const { error: updateError } = await supabaseClient
        .from('bookings')
        .update({
          payment_status: 'failed',
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)

      if (updateError) {
        console.error('Erreur mise à jour échec paiement:', updateError)
        throw updateError
      }

      console.log('Paiement refusé - Réservation annulée')
    }

    return new Response(
      JSON.stringify({ success: true, processed: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Erreur webhook CinetPay escrow:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
