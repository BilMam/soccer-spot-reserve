
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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    
    if (!user?.email) {
      throw new Error("Utilisateur non authentifié");
    }

    const { booking_id, amount, field_name, date, time } = await req.json();

    if (!booking_id || !amount) {
      throw new Error("Données de réservation manquantes");
    }

    // Récupérer la réservation et vérifier le propriétaire
    const { data: booking, error: bookingError } = await supabaseServiceRole
      .from('bookings')
      .select(`
        *,
        fields (
          owner_id,
          name
        )
      `)
      .eq('id', booking_id)
      .eq('user_id', user.id)
      .single();

    if (bookingError || !booking) {
      throw new Error("Réservation introuvable ou non autorisée");
    }

    // Récupérer le compte Stripe du propriétaire
    const { data: stripeAccount, error: stripeError } = await supabaseServiceRole
      .from('stripe_accounts')
      .select('*')
      .eq('owner_id', booking.fields.owner_id)
      .eq('charges_enabled', true)
      .single();

    if (stripeError || !stripeAccount) {
      throw new Error("Le propriétaire n'a pas de compte Stripe activé");
    }

    // Initialiser Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Calculer les montants (5% de commission)
    const totalAmountCents = Math.round(amount * 100); // Convertir en centimes
    const platformFeeCents = Math.round(totalAmountCents * 0.05); // 5% de commission
    const ownerAmountCents = totalAmountCents - platformFeeCents;

    // Vérifier/créer un client Stripe
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Créer une session de paiement avec transfert automatique
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "xof", // Franc CFA
            product_data: {
              name: `Réservation - ${field_name || booking.fields.name}`,
              description: `${date} de ${time}`,
            },
            unit_amount: totalAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: stripeAccount.stripe_account_id,
        },
      },
      success_url: `${req.headers.get("origin")}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/field/${booking.field_id}`,
      metadata: {
        booking_id: booking_id,
        user_id: user.id,
        owner_id: booking.fields.owner_id,
        platform_fee: platformFeeCents.toString(),
        owner_amount: ownerAmountCents.toString(),
      },
    });

    // Mettre à jour la réservation avec les détails de paiement
    await supabaseServiceRole
      .from('bookings')
      .update({ 
        payment_intent_id: session.id,
        currency: 'XOF',
        platform_fee: platformFeeCents / 100,
        owner_amount: ownerAmountCents / 100,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id);

    console.log(`Paiement créé: Total ${totalAmountCents/100} XOF, Commission ${platformFeeCents/100} XOF, Propriétaire ${ownerAmountCents/100} XOF`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Erreur dans create-connect-payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
