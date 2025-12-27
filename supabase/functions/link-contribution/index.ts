// Edge function: POST /contributions/link - Lier une contribution à son compte
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier l'utilisateur
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { proof_token } = await req.json();

    if (!proof_token) {
      return new Response(
        JSON.stringify({ error: 'Token de preuve manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer la contribution
    const { data: contribution, error: fetchError } = await supabase
      .from('cagnotte_contribution')
      .select('id, user_id, payer_phone_hash')
      .eq('proof_token', proof_token)
      .maybeSingle();

    if (fetchError || !contribution) {
      return new Response(
        JSON.stringify({ error: 'Contribution introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (contribution.user_id) {
      return new Response(
        JSON.stringify({ error: 'Cette contribution est déjà liée à un compte' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le profil de l'utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('handle, phone_hash, phone_verified')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profil introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Déterminer le badge
    let badge = 'LINKED';
    if (contribution.payer_phone_hash && profile.phone_hash === contribution.payer_phone_hash && profile.phone_verified) {
      badge = 'VERIFIED';
    }

    // Lier la contribution
    const { error: updateError } = await supabase
      .from('cagnotte_contribution')
      .update({
        user_id: user.id,
        handle_snapshot: profile.handle,
        identity_badge: badge
      })
      .eq('id', contribution.id);

    if (updateError) {
      console.error('Error linking contribution:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la liaison' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        badge,
        message: badge === 'VERIFIED' 
          ? 'Contribution liée et vérifiée ✅' 
          : 'Contribution liée à votre compte 🔗'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in link-contribution:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
