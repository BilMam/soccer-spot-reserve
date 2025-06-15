
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature!,
        Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
      );
    } catch (err) {
      console.error("Erreur de vérification webhook:", err);
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    console.log("Webhook reçu:", event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.metadata?.booking_id) {
          // Marquer la réservation comme confirmée et payée
          await supabaseServiceRole
            .from('bookings')
            .update({ 
              payment_status: 'paid',
              status: 'confirmed',
              updated_at: new Date().toISOString()
            })
            .eq('id', session.metadata.booking_id);

          console.log(`Réservation ${session.metadata.booking_id} confirmée et payée`);

          // Envoyer l'email de confirmation
          await supabaseServiceRole.functions.invoke('send-booking-email', {
            body: {
              booking_id: session.metadata.booking_id,
              notification_type: 'payment_confirmation'
            }
          });
        }
        break;

      case 'account.updated':
        const account = event.data.object as Stripe.Account;
        
        // Mettre à jour le statut du compte Stripe
        await supabaseServiceRole
          .from('stripe_accounts')
          .update({
            account_status: account.details_submitted ? 'active' : 'pending',
            details_submitted: account.details_submitted,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_account_id', account.id);

        // Mettre à jour le profil du propriétaire
        if (account.charges_enabled && account.payouts_enabled) {
          const { data: stripeAccountData } = await supabaseServiceRole
            .from('stripe_accounts')
            .select('owner_id')
            .eq('stripe_account_id', account.id)
            .single();

          if (stripeAccountData) {
            await supabaseServiceRole
              .from('profiles')
              .update({
                stripe_onboarding_completed: true,
                stripe_account_verified: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', stripeAccountData.owner_id);
          }
        }

        console.log(`Compte Stripe ${account.id} mis à jour`);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        
        if (failedPayment.metadata?.booking_id) {
          await supabaseServiceRole
            .from('bookings')
            .update({ 
              payment_status: 'failed',
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('id', failedPayment.metadata.booking_id);

          console.log(`Paiement échoué pour la réservation ${failedPayment.metadata.booking_id}`);
        }
        break;

      default:
        console.log(`Événement non géré: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Erreur dans stripe-webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
