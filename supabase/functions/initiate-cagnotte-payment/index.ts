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

    // Gérer le minimum PSP (3000 XOF pour PayDunya)
    const PSP_MINIMUM = 3000;
    let invoiceAmount = amount;
    let operatorAdjustment = 0;

    if (amount < PSP_MINIMUM) {
      operatorAdjustment = PSP_MINIMUM - amount;
      invoiceAmount = PSP_MINIMUM;
      console.log(`[initiate-cagnotte-payment] Ajustement opérateur: ${amount} XOF → ${invoiceAmount} XOF (+${operatorAdjustment})`);
    }

    // Récupérer la cagnotte
    const { data: cagnotte, error: cagnotteError } = await supabase
      .from('cagnotte')
      .select('*, field:fields(name)')
      .eq('id', cagnotte_id)
      .single();

    if (cagnotteError) throw cagnotteError;

    // Créer l'invoice PayDunya avec URLs de retour appropriées
    const invoiceToken = `cagnotte_${cagnotte_id}_${Date.now()}`;
    
    // Récupérer l'origine frontend (env ou fallback sur l'origine de la requête)
    const frontendBase = Deno.env.get('FRONTEND_BASE_URL') || new URL(req.url).origin;
    const returnUrl = `${frontendBase}/cagnotte/${cagnotte_id}?thanks=1&team=${team}&amount=${amount}&tx=${invoiceToken}`;
    const cancelUrl = `${frontendBase}/cagnotte/${cagnotte_id}?cancel=1&team=${team}`;
    
    const paydunyaData = {
      invoice: {
        total_amount: invoiceAmount,
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
        contribution_amount: amount,
        team,
        invoice_token: invoiceToken,
        operator_adjustment: operatorAdjustment
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
      throw new Error(paydunyaResult.response_text || 'Erreur PayDunya');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment_url: paydunyaResult.response_text,
        invoice_token: invoiceToken,
        operator_adjustment: operatorAdjustment,
        invoice_amount: invoiceAmount,
        requested_amount: amount
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
