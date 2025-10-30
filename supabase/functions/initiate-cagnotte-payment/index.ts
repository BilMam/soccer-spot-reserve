import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { cagnotte_id, amount, team } = await req.json();

    // Validate team
    if (!team || !['A', 'B'].includes(team)) {
      throw new Error('Équipe invalide: doit être A ou B');
    }

    // Arrondir le montant au supérieur (XOF = entiers)
    const requestedInt = Math.ceil(amount);
    
    if (requestedInt <= 0) {
      throw new Error('Montant invalide');
    }

    // Récupérer la cagnotte
    const { data: cagnotte, error: cagnotteError } = await supabase
      .from('cagnotte')
      .select('*, field:fields(name)')
      .eq('id', cagnotte_id)
      .single();

    if (cagnotteError) throw cagnotteError;

    // Calculer le reliquat d'équipe et caper le montant
    const { data: teamInfo, error: teamError } = await supabase
      .rpc('get_cagnotte_team_info', { p_cagnotte_id: cagnotte_id, p_team: team });
    
    if (teamError) throw teamError;
    
    const teamRemainingInt = Math.max(0, Math.floor(teamInfo.team_remaining));
    const amountInt = Math.min(requestedInt, teamRemainingInt);
    
    if (amountInt <= 0) {
      throw new Error('Montant invalide ou équipe déjà complète');
    }

    // Créer l'invoice PayDunya avec URLs de retour appropriées
    const invoiceToken = `cagnotte_${cagnotte_id}_${Date.now()}`;
    
    // Récupérer l'origine frontend (env ou fallback sur l'origine de la requête)
    const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || new URL(req.url).origin;
    const returnUrl = `${APP_BASE_URL}/cagnotte/${cagnotte_id}?thanks=1&team=${team}&tx=${invoiceToken}`;
    const cancelUrl = `${APP_BASE_URL}/cagnotte/${cagnotte_id}?canceled=1`;
    
    console.log(`[initiate-cagnotte-payment] Montant demandé: ${requestedInt} XOF, Cap équipe: ${teamRemainingInt} XOF, Montant facture: ${amountInt} XOF`);
    
    const paydunyaData = {
      invoice: {
        total_amount: amountInt,
        description: `Contribution cagnotte - ${cagnotte.field.name} - ${cagnotte.slot_date}`,
      },
      store: {
        name: "MySport",
        tagline: "Réservation de terrains de sport",
        postal_address: "Abidjan, Côte d'Ivoire",
        phone_number: "+225 0707070707",
        website_url: "https://pisport.app",
        logo_url: "https://pisport.app/logo.png"
      },
      actions: {
        cancel_url: cancelUrl,
        return_url: returnUrl,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paydunya-ipn`
      },
      custom_data: {
        cagnotte_id,
        contribution_amount: amountInt,
        team,
        invoice_token: invoiceToken
      }
    };

    const paydunyaResponse = await fetch('https://app.paydunya.com/api/v1/checkout-invoice/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': Deno.env.get('PAYDUNYA_MASTER_KEY')!,
        'PAYDUNYA-PRIVATE-KEY': Deno.env.get('PAYDUNYA_PRIVATE_KEY')!,
        'PAYDUNYA-TOKEN': Deno.env.get('PAYDUNYA_TOKEN')!,
        'PAYDUNYA-MODE': 'live'
      },
      body: JSON.stringify(paydunyaData)
    });

    const paydunyaResult = await paydunyaResponse.json();

    if (paydunyaResult.response_code !== '00') {
      const errorMsg = paydunyaResult.response_text || 'Erreur PayDunya';
      console.error('[initiate-cagnotte-payment] Erreur PSP:', errorMsg, paydunyaResult);
      throw new Error(errorMsg);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment_url: paydunyaResult.response_text,
        invoice_token: invoiceToken,
        invoice_amount: amountInt,
        requested_amount: requestedInt
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[initiate-cagnotte-payment] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
