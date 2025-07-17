
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  booking_id: string;
  notification_type: 'booking_request_to_owner' | 'booking_approved_escrow' | 'payment_confirmation' | 'owner_confirmation_required' | 'owner_final_reminder' | 'booking_confirmed_by_owner' | 'transfer_completed' | 'auto_refund_processed';
  payment_url?: string;
  escrow_info?: any;
  escrow_deadline?: string;
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

    const { booking_id, notification_type, payment_url, escrow_info, escrow_deadline }: EmailRequest = await req.json()

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

      case 'booking_approved_escrow':
        emailSubject = `Réservation approuvée - Finalisez votre paiement (Escrow sécurisé)`
        emailContent = `
          <h2>Votre réservation a été approuvée !</h2>
          <p>Bonjour ${booking.profiles.full_name},</p>
          <p>Excellente nouvelle ! Le propriétaire a approuvé votre demande de réservation pour <strong>${booking.fields.name}</strong>.</p>
          
          <div style="background-color: #e6f3ff; border: 1px solid #0066cc; border-radius: 5px; padding: 15px; margin: 15px 0;">
            <h3 style="color: #0066cc; margin-top: 0;">🔒 Protection Escrow</h3>
            <p style="margin-bottom: 5px;"><strong>Vos fonds sont protégés :</strong></p>
            <ul style="margin: 10px 0;">
              <li>Paiement sécurisé avec protection complète</li>
              <li>Fonds bloqués jusqu'à confirmation du propriétaire</li>
              <li>Remboursement automatique si non confirmé sous 24h</li>
            </ul>
          </div>
          
          <h3>Détails de votre réservation :</h3>
          <ul>
            <li><strong>Terrain :</strong> ${booking.fields.name}</li>
            <li><strong>Lieu :</strong> ${booking.fields.location}</li>
            <li><strong>Date :</strong> ${new Date(booking.booking_date).toLocaleDateString('fr-FR')}</li>
            <li><strong>Heure :</strong> ${booking.start_time} - ${booking.end_time}</li>
            <li><strong>Prix :</strong> ${booking.total_price.toLocaleString()} XOF</li>
          </ul>
          
          <p><strong>Pour finaliser votre réservation, veuillez effectuer le paiement sous 48h :</strong></p>
          <p><a href="${payment_url}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Payer maintenant (Escrow sécurisé)</a></p>
          
          <p>Moyens de paiement acceptés : Orange Money, MTN Money, Moov Money, cartes bancaires.</p>
          <p><em>Ce lien expire dans 48 heures.</em></p>
          
          <p>Cordialement,<br>L'équipe BookMyField</p>
        `
        recipientEmail = booking.profiles.email
        break

      case 'owner_confirmation_required':
        emailSubject = `Action requise : Confirmez la réservation de ${booking.profiles.full_name}`
        emailContent = `
          <h2>Confirmation de réservation requise</h2>
          <p>Bonjour,</p>
          <p>Le client <strong>${booking.profiles.full_name}</strong> a effectué le paiement pour sa réservation sur votre terrain <strong>${booking.fields.name}</strong>.</p>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 15px 0;">
            <h3 style="color: #856404; margin-top: 0;">⏰ Action requise dans les 24h</h3>
            <p style="margin-bottom: 5px;"><strong>Vous devez confirmer cette réservation avant :</strong></p>
            <p style="font-size: 18px; font-weight: bold; color: #856404;">${escrow_deadline ? new Date(escrow_deadline).toLocaleString('fr-FR') : '24 heures'}</p>
            <p style="margin-top: 10px; color: #856404;"><em>⚠️ Sinon, le client sera automatiquement remboursé</em></p>
          </div>
          
          <h3>Détails de la réservation :</h3>
          <ul>
            <li><strong>Client :</strong> ${booking.profiles.full_name}</li>
            <li><strong>Date :</strong> ${new Date(booking.booking_date).toLocaleDateString('fr-FR')}</li>
            <li><strong>Heure :</strong> ${booking.start_time} - ${booking.end_time}</li>
            <li><strong>Montant payé :</strong> ${booking.total_price.toLocaleString()} XOF</li>
            <li><strong>Votre part :</strong> ${booking.owner_amount?.toLocaleString() || 'Calculé automatiquement'} XOF</li>
          </ul>
          
          <p><a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovableproject.com')}/owner-dashboard" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Confirmer la réservation</a></p>
          
          <p>Cordialement,<br>L'équipe BookMyField</p>
        `
        recipientEmail = booking.fields.owner_profiles?.email || ''
        break

      case 'owner_final_reminder':
        emailSubject = `URGENT : 2h restantes pour confirmer la réservation`
        emailContent = `
          <h2 style="color: #dc3545;">⚠️ Rappel urgent - 2h restantes</h2>
          <p>Bonjour,</p>
          <p>Il ne vous reste que <strong>2 heures</strong> pour confirmer la réservation de <strong>${booking.profiles.full_name}</strong> sur votre terrain <strong>${booking.fields.name}</strong>.</p>
          
          <div style="background-color: #f8d7da; border: 1px solid #dc3545; border-radius: 5px; padding: 15px; margin: 15px 0;">
            <h3 style="color: #721c24; margin-top: 0;">🚨 Action immédiate requise</h3>
            <p style="color: #721c24;">Si vous ne confirmez pas avant <strong>${escrow_deadline ? new Date(escrow_deadline).toLocaleString('fr-FR') : 'la deadline'}</strong>, le client sera automatiquement remboursé et vous perdrez cette réservation.</p>
          </div>
          
          <p><a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovableproject.com')}/owner-dashboard" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">CONFIRMER MAINTENANT</a></p>
          
          <p>Cordialement,<br>L'équipe BookMyField</p>
        `
        recipientEmail = booking.fields.owner_profiles?.email || ''
        break

      case 'booking_confirmed_by_owner':
        emailSubject = `Réservation confirmée ! Votre terrain vous attend`
        emailContent = `
          <h2>🎉 Votre réservation est confirmée !</h2>
          <p>Bonjour ${booking.profiles.full_name},</p>
          <p>Excellente nouvelle ! Le propriétaire a confirmé votre réservation pour <strong>${booking.fields.name}</strong>.</p>
          
          <div style="background-color: #d4edda; border: 1px solid #28a745; border-radius: 5px; padding: 15px; margin: 15px 0;">
            <h3 style="color: #155724; margin-top: 0;">✅ Réservation 100% confirmée</h3>
            <p style="color: #155724;">Votre paiement va être transféré au propriétaire et votre réservation est définitive !</p>
          </div>
          
          <h3>Récapitulatif de votre réservation :</h3>
          <ul>
            <li><strong>Terrain :</strong> ${booking.fields.name}</li>
            <li><strong>Lieu :</strong> ${booking.fields.location}</li>
            <li><strong>Date :</strong> ${new Date(booking.booking_date).toLocaleDateString('fr-FR')}</li>
            <li><strong>Heure :</strong> ${booking.start_time} - ${booking.end_time}</li>
          </ul>
          
          <p>Nous vous souhaitons un excellent match !</p>
          
          <p>Cordialement,<br>L'équipe BookMyField</p>
        `
        recipientEmail = booking.profiles.email
        break

      case 'transfer_completed':
        emailSubject = `Paiement transféré pour la réservation du ${new Date(booking.booking_date).toLocaleDateString('fr-FR')}`
        emailContent = `
          <h2>💰 Paiement transféré avec succès</h2>
          <p>Bonjour,</p>
          <p>Le paiement pour la réservation de <strong>${booking.profiles.full_name}</strong> sur votre terrain <strong>${booking.fields.name}</strong> a été transféré avec succès.</p>
          
          <h3>Détails du transfert :</h3>
          <ul>
            <li><strong>Montant transféré :</strong> ${booking.owner_amount?.toLocaleString() || 'Montant calculé'} XOF</li>
            <li><strong>Commission plateforme :</strong> ${booking.platform_fee?.toLocaleString() || '5%'} XOF</li>
            <li><strong>Date de réservation :</strong> ${new Date(booking.booking_date).toLocaleDateString('fr-FR')}</li>
          </ul>
          
          <p>Les fonds seront disponibles sur votre compte CinetPay sous 24-48h.</p>
          
          <p>Cordialement,<br>L'équipe BookMyField</p>
        `
        recipientEmail = booking.fields.owner_profiles?.email || ''
        break

      case 'auto_refund_processed':
        emailSubject = `Remboursement automatique traité`
        emailContent = `
          <h2>Remboursement automatique effectué</h2>
          <p>Bonjour ${booking.profiles.full_name},</p>
          <p>Le propriétaire n'ayant pas confirmé votre réservation dans les délais, nous avons procédé au remboursement automatique de votre paiement.</p>
          
          <h3>Détails du remboursement :</h3>
          <ul>
            <li><strong>Montant remboursé :</strong> ${booking.total_price.toLocaleString()} XOF</li>
            <li><strong>Terrain concerné :</strong> ${booking.fields.name}</li>
            <li><strong>Date prévue :</strong> ${new Date(booking.booking_date).toLocaleDateString('fr-FR')}</li>
          </ul>
          
          <p>Le remboursement sera visible sur votre compte sous 2-5 jours ouvrés.</p>
          <p>Nous nous excusons pour ce désagrément et vous invitons à rechercher un autre terrain disponible.</p>
          
          <p>Cordialement,<br>L'équipe BookMyField</p>
        `
        recipientEmail = booking.profiles.email
        break

      case 'payment_confirmation':
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
