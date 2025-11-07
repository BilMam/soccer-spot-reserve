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

    console.log('[check-hold-consistency] 🔍 Vérification des cagnottes...');

    // Trouver toutes les cagnottes IN_PROGRESS
    const { data: cagnottes, error } = await supabase
      .from('cagnotte')
      .select('*')
      .eq('status', 'IN_PROGRESS')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const results = [];
    let checkedCount = 0;
    let fixedCount = 0;

    for (const cagnotte of cagnottes || []) {
      checkedCount++;
      const thresholdAmount = cagnotte.total_amount * cagnotte.hold_threshold_pct / 100;
      
      // Vérifier si le seuil de HOLD est atteint mais pas encore appliqué
      if (cagnotte.collected_amount >= thresholdAmount && !cagnotte.hold_started_at) {
        console.log(`[check-hold-consistency] 🔧 Cagnotte ${cagnotte.id} devrait être en HOLD (${cagnotte.collected_amount}/${thresholdAmount})`);
        
        // Appeler la fonction SQL pour mettre à jour le statut
        const { error: updateError } = await supabase.rpc('update_cagnotte_progress', {
          p_cagnotte_id: cagnotte.id
        });

        if (updateError) {
          console.error(`[check-hold-consistency] ❌ Erreur mise à jour:`, updateError);
          results.push({ 
            id: cagnotte.id, 
            status: 'ERROR', 
            error: updateError.message,
            collected: cagnotte.collected_amount,
            threshold: thresholdAmount
          });
        } else {
          console.log(`[check-hold-consistency] ✅ Cagnotte ${cagnotte.id} corrigée et mise en HOLD`);
          fixedCount++;
          results.push({ 
            id: cagnotte.id, 
            status: 'FIXED',
            collected: cagnotte.collected_amount,
            threshold: thresholdAmount
          });
        }
      }
    }

    console.log(`[check-hold-consistency] Résumé: ${checkedCount} vérifiées, ${fixedCount} corrigées`);

    return new Response(
      JSON.stringify({
        success: true,
        checked: checkedCount,
        fixed: fixedCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[check-hold-consistency] 💥 Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
