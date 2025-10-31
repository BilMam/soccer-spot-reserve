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
      throw new Error('Montant invalide : doit être supérieur à 0');
    }

    // Récupérer la cagnotte
    const { data: cagnotte, error: cagnotteError } = await supabase
      .from('cagnotte')
      .select('*, field:fields(name)')
      .eq('id', cagnotte_id)
      .single();

    if (cagnotteError) {
      console.error('[initiate-cagnotte-payment] Cagnotte not found:', cagnotteError);
      throw new Error('Cagnotte introuvable');
    }
    
    if (!cagnotte) {
      console.error('[initiate-cagnotte-payment] Cagnotte is null for id:', cagnotte_id);
      throw new Error('Cagnotte introuvable');
    }

    // Calculer le reliquat d'équipe et caper le montant
    const { data: teamInfo, error: teamError } = await supabase
      .rpc('get_cagnotte_team_info', { p_cagnotte_id: cagnotte_id, p_team: team });
    
    if (teamError) {
      console.error('[initiate-cagnotte-payment] Error fetching team info:', teamError);
      throw new Error('Impossible de récupérer les informations d\'équipe');
    }
    
    const teamRemainingInt = Math.max(0, Math.floor(teamInfo.team_remaining));
    const amountInt = Math.min(requestedInt, teamRemainingInt);
    
    console.log(`[initiate-cagnotte-payment] Team info:`, {
      team,
      team_remaining: teamInfo.team_remaining,
      team_collected: teamInfo.team_collected,
      team_target: teamInfo.team_target,
      requested: requestedInt,
      capped: amountInt
    });
    
    if (amountInt <= 0) {
      throw new Error(`Montant invalide (${requestedInt} XOF demandé, ${teamRemainingInt} XOF restant pour l'équipe ${team})`);
    }

    // Créer l'invoice PayDunya avec URLs de retour appropriées
    const invoiceToken = `cagnotte_${cagnotte_id}_${Date.now()}`;
    
    // Utiliser l'URL publique de l'application (comme dans create-paydunya-invoice)
    const frontendBaseUrl = 'https://pisport.app';
    const returnUrl = `${frontendBaseUrl}/cagnotte/${cagnotte_id}?thanks=1&team=${team}&tx=${invoiceToken}`;
    const cancelUrl = `${frontendBaseUrl}/cagnotte/${cagnotte_id}?canceled=1`;
    
    console.log(`[initiate-cagnotte-payment] Montant demandé: ${requestedInt} XOF, Cap équipe: ${teamRemainingInt} XOF, Montant facture: ${amountInt} XOF`);
    
    console.log('[initiate-cagnotte-payment] PayDunya API URL:', 'https://app.paydunya.com/api/v1/checkout-invoice/create');
    
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

    console.log('[initiate-cagnotte-payment] PayDunya request payload:', JSON.stringify(paydunyaData, null, 2));

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

    console.log('[initiate-cagnotte-payment] PayDunya response status:', paydunyaResponse.status);
    console.log('[initiate-cagnotte-payment] PayDunya response headers:', Object.fromEntries(paydunyaResponse.headers.entries()));

    const paydunyaResult = await paydunyaResponse.json();
    
    console.log('[initiate-cagnotte-payment] PayDunya response body:', JSON.stringify(paydunyaResult, null, 2));

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
