
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  booking_id: string;
  notification_type: 'booking_request_to_owner' | 'booking_approved' | 'payment_confirmation';
  payment_url?: string;
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

    const { booking_id, notification_type, payment_url }: EmailRequest = await req.json()

    console.log('Envoi email de réservation:', { booking_id, notification_type })

    // Récupérer les détails de la réservation
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        profiles!inner(email, full_name),
        fields!inner(name, location, owner_id),
        fields!inner!owner_profiles:owner_id(email, full_name)
      `)
      .eq('id', booking_id)
      .single()

    if (bookingError) {
      console.error('Erreur récupération réservation:', bookingError)
      throw bookingError
    }

    let emailSubject = ''
    let emailContent = ''
    let recipientEmail = ''

    switch (notification_type) {
      case 'booking_request_to_owner':
        // Email au propriétaire pour nouvelle demande
        emailSubject = `Nouvelle demande de réservation - ${booking.fields.name}`
        emailContent = `
          <h2>Nouvelle demande de réservation</h2>
          <p>Bonjour,</p>
          <p>Vous avez reçu une nouvelle demande de réservation pour votre terrain <strong>${booking.fields.name}</strong>.</p>
          
          <h3>Détails de la demande :</h3>
          <ul>
            <li><strong>Client :</strong> ${booking.profiles.full_name}</li>
            <li><strong>Date :</strong> ${new Date(booking.booking_date).toLocaleDateString('fr-FR')}</li>
            <li><strong>Heure :</strong> ${booking.start_time} - ${booking.end_time}</li>
            <li><strong>Nombre de joueurs :</strong> ${booking.player_count || 'Non spécifié'}</li>
            <li><strong>Prix :</strong> ${booking.total_price.toLocaleString()} XOF</li>
          </ul>
          
          ${booking.special_requests ? `<p><strong>Demandes spéciales :</strong> ${booking.special_requests}</p>` : ''}
          
          <p>Connectez-vous à votre tableau de bord pour approuver ou refuser cette demande :</p>
          <p><a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovableproject.com')}/owner-dashboard" style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir la demande</a></p>
          
          <p>Cordialement,<br>L'équipe BookMyField</p>
        `
        recipientEmail = booking.fields.owner_profiles?.email || ''
        break

      case 'booking_approved':
        // Email au client avec lien de paiement
        emailSubject = `Réservation approuvée - Finalisez votre paiement`
        emailContent = `
          <h2>Votre réservation a été approuvée !</h2>
          <p>Bonjour ${booking.profiles.full_name},</p>
          <p>Excellente nouvelle ! Le propriétaire a approuvé votre demande de réservation pour <strong>${booking.fields.name}</strong>.</p>
          
          <h3>Détails de votre réservation :</h3>
          <ul>
            <li><strong>Terrain :</strong> ${booking.fields.name}</li>
            <li><strong>Lieu :</strong> ${booking.fields.location}</li>
            <li><strong>Date :</strong> ${new Date(booking.booking_date).toLocaleDateString('fr-FR')}</li>
            <li><strong>Heure :</strong> ${booking.start_time} - ${booking.end_time}</li>
            <li><strong>Prix :</strong> ${booking.total_price.toLocaleString()} XOF</li>
          </ul>
          
          <p><strong>Pour finaliser votre réservation, veuillez effectuer le paiement sous 48h :</strong></p>
          <p><a href="${payment_url}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Payer maintenant</a></p>
          
          <p>Moyens de paiement acceptés : Orange Money, MTN Money, Moov Money, cartes bancaires.</p>
          <p><em>Ce lien expire dans 48 heures.</em></p>
          
          <p>Cordialement,<br>L'équipe BookMyField</p>
        `
        recipientEmail = booking.profiles.email
        break

      case 'payment_confirmation':
        // Email de confirmation après paiement
        emailSubject = `Réservation confirmée - ${booking.fields.name}`
        emailContent = `
          <h2>Votre réservation est confirmée !</h2>
          <p>Bonjour ${booking.profiles.full_name},</p>
          <p>Votre paiement a été traité avec succès. Votre réservation est maintenant confirmée !</p>
          
          <h3>Détails de votre réservation :</h3>
          <ul>
            <li><strong>Terrain :</strong> ${booking.fields.name}</li>
            <li><strong>Lieu :</strong> ${booking.fields.location}</li>
            <li><strong>Date :</strong> ${new Date(booking.booking_date).toLocaleDateString('fr-FR')}</li>
            <li><strong>Heure :</strong> ${booking.start_time} - ${booking.end_time}</li>
            <li><strong>Prix payé :</strong> ${booking.total_price.toLocaleString()} XOF</li>
          </ul>
          
          <p>Nous vous souhaitons un excellent match !</p>
          
          <p>Cordialement,<br>L'équipe BookMyField</p>
        `
        recipientEmail = booking.profiles.email
        break
    }

    // Enregistrer la notification
    await supabaseClient
      .from('booking_notifications')
      .insert({
        booking_id: booking_id,
        notification_type: notification_type,
        recipient_email: recipientEmail,
        status: 'sent'
      })

    console.log(`Email ${notification_type} envoyé à ${recipientEmail}`)

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error: any) {
    console.error('Erreur envoi email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
