
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { booking_id, notification_type } = await req.json();

    // Récupérer les détails de la réservation
    const { data: booking, error: bookingError } = await supabaseServiceRole
      .from('bookings')
      .select(`
        *,
        fields (name, location, address),
        profiles (full_name, email)
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error("Réservation introuvable");
    }

    const userEmail = booking.profiles.email;
    const userName = booking.profiles.full_name || "Client";
    const fieldName = booking.fields.name;
    const fieldLocation = booking.fields.location;

    let subject = "";
    let htmlContent = "";

    switch (notification_type) {
      case "booking_confirmation":
        subject = `Confirmation de réservation - ${fieldName}`;
        htmlContent = `
          <h1>Réservation confirmée !</h1>
          <p>Bonjour ${userName},</p>
          <p>Votre réservation a été confirmée avec succès.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Détails de votre réservation :</h3>
            <p><strong>Terrain :</strong> ${fieldName}</p>
            <p><strong>Lieu :</strong> ${fieldLocation}</p>
            <p><strong>Date :</strong> ${new Date(booking.booking_date).toLocaleDateString('fr-FR')}</p>
            <p><strong>Heure :</strong> ${booking.start_time} - ${booking.end_time}</p>
            <p><strong>Nombre de joueurs :</strong> ${booking.player_count || 'Non spécifié'}</p>
            <p><strong>Prix total :</strong> ${booking.total_price}€</p>
          </div>
          <p>Nous vous attendons avec impatience !</p>
          <p>L'équipe FieldBook</p>
        `;
        break;

      case "payment_confirmation":
        subject = `Paiement confirmé - ${fieldName}`;
        htmlContent = `
          <h1>Paiement reçu !</h1>
          <p>Bonjour ${userName},</p>
          <p>Nous avons bien reçu votre paiement de ${booking.total_price}€.</p>
          <p>Votre réservation est maintenant confirmée.</p>
          <p>À bientôt sur nos terrains !</p>
          <p>L'équipe FieldBook</p>
        `;
        break;

      case "booking_reminder":
        subject = `Rappel de réservation - ${fieldName}`;
        htmlContent = `
          <h1>Rappel de votre réservation</h1>
          <p>Bonjour ${userName},</p>
          <p>Nous vous rappelons que vous avez une réservation prévue demain :</p>
          <p><strong>${fieldName}</strong> à ${booking.start_time}</p>
          <p>À bientôt !</p>
          <p>L'équipe FieldBook</p>
        `;
        break;

      case "cancellation_notice":
        subject = `Annulation de réservation - ${fieldName}`;
        htmlContent = `
          <h1>Réservation annulée</h1>
          <p>Bonjour ${userName},</p>
          <p>Votre réservation du ${new Date(booking.booking_date).toLocaleDateString('fr-FR')} a été annulée.</p>
          ${booking.cancellation_reason ? `<p><strong>Raison :</strong> ${booking.cancellation_reason}</p>` : ''}
          <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
          <p>L'équipe FieldBook</p>
        `;
        break;

      default:
        throw new Error("Type de notification non reconnu");
    }

    // Envoyer l'email
    const emailResponse = await resend.emails.send({
      from: "FieldBook <noreply@fieldbook.com>",
      to: [userEmail],
      subject: subject,
      html: htmlContent,
    });

    // Enregistrer la notification dans la base de données
    await supabaseServiceRole
      .from('booking_notifications')
      .insert({
        booking_id: booking_id,
        notification_type: notification_type,
        recipient_email: userEmail,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

    return new Response(JSON.stringify({ success: true, email_id: emailResponse.data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Erreur dans send-booking-email:", error);
    
    // Enregistrer l'erreur dans la base de données si possible
    if (req.body) {
      try {
        const { booking_id, notification_type } = await req.json();
        const supabaseServiceRole = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        
        await supabaseServiceRole
          .from('booking_notifications')
          .insert({
            booking_id: booking_id,
            notification_type: notification_type,
            recipient_email: 'unknown',
            status: 'failed',
            error_message: error.message
          });
      } catch (dbError) {
        console.error("Erreur lors de l'enregistrement de l'erreur:", dbError);
      }
    }

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
