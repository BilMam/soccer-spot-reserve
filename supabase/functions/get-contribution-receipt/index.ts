// Edge function: GET /receipt/:proof_token - Reçu secret de contribution
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

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const proofToken = pathParts[pathParts.length - 1];

    if (!proofToken) {
      return new Response(
        JSON.stringify({ error: 'Token de reçu manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Récupérer la contribution avec le token secret
    const { data: contribution, error } = await supabase
      .from('cagnotte_contribution')
      .select(`
        id,
        amount,
        team,
        status,
        paid_at,
        psp_tx_id,
        handle_snapshot,
        identity_badge,
        payer_phone_masked,
        proof_code,
        user_id,
        cagnotte:cagnotte_id (
          id,
          slot_date,
          slot_start_time,
          slot_end_time,
          status,
          field:field_id (
            name,
            location
          )
        )
      `)
      .eq('proof_token', proofToken)
      .maybeSingle();

    if (error || !contribution) {
      return new Response(
        JSON.stringify({ error: 'Reçu introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formater les données pour l'affichage
    const receipt = {
      id: contribution.id,
      amount: contribution.amount,
      team: contribution.team,
      status: contribution.status,
      paid_at: contribution.paid_at,
      psp_tx_id: contribution.psp_tx_id,
      display_name: contribution.handle_snapshot 
        ? `@${contribution.handle_snapshot}` 
        : contribution.payer_phone_masked 
          ? `Joueur ${contribution.payer_phone_masked}`
          : 'Joueur anonyme',
      badge: contribution.identity_badge,
      proof_code: contribution.proof_code,
      is_linked: !!contribution.user_id,
      user_id: contribution.user_id,
      cagnotte: contribution.cagnotte,
      proof_token: proofToken
    };

    return new Response(
      JSON.stringify(receipt),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in get-contribution-receipt:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
