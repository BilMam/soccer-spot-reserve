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

    console.log('[process-cagnotte-refunds] Starting refund processing...');

    // Récupérer les contributions à rembourser
    const { data: contributions, error } = await supabase
      .from('cagnotte_contribution')
      .select('*, cagnotte:cagnotte(*)')
      .eq('status', 'REFUND_PENDING');

    if (error) {
      console.error('[process-cagnotte-refunds] Error fetching contributions:', error);
      throw error;
    }

    console.log(`[process-cagnotte-refunds] Found ${contributions?.length || 0} contributions to refund`);

    const results = [];

    for (const contrib of contributions || []) {
      try {
        // Appeler l'API PayDunya pour rembourser
        // Note: PayDunya ne supporte pas encore les remboursements automatiques
        // Pour l'instant, on marque comme REFUNDED et on traite manuellement
        
        // TODO: Implémenter l'API de remboursement PayDunya quand disponible
        // const refundResponse = await fetch(`${Deno.env.get('PAYDUNYA_API_URL')}/refund`, {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //     'PAYDUNYA-MASTER-KEY': Deno.env.get('PAYDUNYA_MASTER_KEY')!
        //   },
        //   body: JSON.stringify({
        //     transaction_id: contrib.psp_tx_id,
        //     amount: contrib.amount
        //   })
        // });

        // Pour l'instant : marquer comme remboursé (traitement manuel requis)
        await supabase
          .from('cagnotte_contribution')
          .update({
            status: 'REFUNDED',
            refunded_at: new Date().toISOString()
          })
          .eq('id', contrib.id);

        results.push({ 
          id: contrib.id, 
          status: 'REFUNDED',
          note: 'Marqué pour remboursement manuel via PayDunya'
        });

        console.log(`[process-cagnotte-refunds] Marked contribution ${contrib.id} as REFUNDED`);
      } catch (err: any) {
        console.error(`[process-cagnotte-refunds] Error processing contribution ${contrib.id}:`, err);
        results.push({ id: contrib.id, status: 'ERROR', error: err.message });
      }
    }

    // Vérifier si toutes les contributions d'une cagnotte sont remboursées
    for (const contrib of contributions || []) {
      const { data: allContribs } = await supabase
        .from('cagnotte_contribution')
        .select('status')
        .eq('cagnotte_id', contrib.cagnotte_id)
        .neq('status', 'FAILED');

      const allRefunded = allContribs?.every(c => c.status === 'REFUNDED');

      if (allRefunded) {
        await supabase
          .from('cagnotte')
          .update({ status: 'REFUNDED', updated_at: new Date().toISOString() })
          .eq('id', contrib.cagnotte_id);

        console.log(`[process-cagnotte-refunds] Cagnotte ${contrib.cagnotte_id} fully refunded`);
      }
    }

    console.log('[process-cagnotte-refunds] Refund processing complete');

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        processed_count: results.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[process-cagnotte-refunds] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
