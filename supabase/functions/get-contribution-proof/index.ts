// Edge function: GET /p/:proof_code - Preuve publique de contribution
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
    const proofCode = pathParts[pathParts.length - 1];

    if (!proofCode) {
      return new Response(
        JSON.stringify({ error: 'Code de preuve manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Récupérer la contribution avec les infos de la cagnotte
    const { data: contribution, error } = await supabase
      .from('cagnotte_contribution')
      .select(`
        id,
        amount,
        team,
        status,
        paid_at,
        handle_snapshot,
        identity_badge,
        payer_phone_masked,
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
      .eq('proof_code', proofCode)
      .maybeSingle();

    if (error || !contribution) {
      return new Response(
        JSON.stringify({ error: 'Preuve introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formater les données pour l'affichage
    const proof = {
      amount: contribution.amount,
      team: contribution.team,
      status: contribution.status,
      paid_at: contribution.paid_at,
      display_name: contribution.handle_snapshot 
        ? `@${contribution.handle_snapshot}` 
        : contribution.payer_phone_masked 
          ? `Joueur ${contribution.payer_phone_masked}`
          : 'Joueur anonyme',
      badge: contribution.identity_badge,
      cagnotte: contribution.cagnotte,
      proof_code: proofCode
    };

    return new Response(
      JSON.stringify(proof),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in get-contribution-proof:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
