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

    // Récupérer la cagnotte
    const { data: cagnotte, error: cagnotteError } = await supabase
      .from('cagnotte')
      .select('*, field:fields(name)')
      .eq('id', cagnotte_id)
      .single();

    if (cagnotteError) throw cagnotteError;

    // Créer l'invoice PayDunya
    const invoiceToken = `cagnotte_${cagnotte_id}_${Date.now()}`;
    
    const paydunyaData = {
      invoice: {
        total_amount: amount,
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
        cancel_url: `https://pisport.app/cagnotte/${cagnotte_id}`,
        return_url: `https://pisport.app/cagnotte/${cagnotte_id}`,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paydunya-ipn`
      },
      custom_data: {
        cagnotte_id,
        contribution_amount: amount,
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
      throw new Error(paydunyaResult.response_text || 'Erreur PayDunya');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment_url: paydunyaResult.response_text,
        invoice_token: invoiceToken
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
