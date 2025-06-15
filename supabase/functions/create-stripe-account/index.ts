
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
    // Créer un client Supabase avec la clé de service
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authentifier l'utilisateur
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

    // Vérifier que l'utilisateur est propriétaire
    const { data: profile } = await supabaseServiceRole
      .from('profiles')
      .select('user_type, full_name')
      .eq('id', user.id)
      .single();

    if (!profile || profile.user_type !== 'owner') {
      throw new Error("Seuls les propriétaires peuvent créer un compte Stripe");
    }

    // Vérifier si un compte Stripe existe déjà
    const { data: existingAccount } = await supabaseServiceRole
      .from('stripe_accounts')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (existingAccount) {
      return new Response(JSON.stringify({ 
        account_id: existingAccount.stripe_account_id,
        onboarding_url: existingAccount.onboarding_url 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Initialiser Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Créer un compte Express Stripe Connect pour la Côte d'Ivoire
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'CI', // Code pays pour Côte d'Ivoire
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      individual: {
        email: user.email,
        first_name: profile.full_name?.split(' ')[0] || '',
        last_name: profile.full_name?.split(' ').slice(1).join(' ') || '',
      },
      default_currency: 'xof', // Franc CFA
    });

    // Créer un lien d'onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.headers.get("origin")}/owner-dashboard?refresh=stripe`,
      return_url: `${req.headers.get("origin")}/owner-dashboard?success=stripe`,
      type: 'account_onboarding',
    });

    // Sauvegarder dans Supabase
    await supabaseServiceRole
      .from('stripe_accounts')
      .insert({
        owner_id: user.id,
        stripe_account_id: account.id,
        account_status: 'pending',
        onboarding_url: accountLink.url,
        details_submitted: false,
        charges_enabled: false,
        payouts_enabled: false
      });

    return new Response(JSON.stringify({ 
      account_id: account.id,
      onboarding_url: accountLink.url 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Erreur dans create-stripe-account:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
