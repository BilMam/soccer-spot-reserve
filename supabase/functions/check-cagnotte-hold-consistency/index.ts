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

    console.log('[check-hold-consistency] Vérification des cagnottes...');

    // 1. Trouver toutes les cagnottes IN_PROGRESS non expirées
    const { data: cagnottes, error } = await supabase
      .from('cagnotte')
      .select('*')
      .eq('status', 'IN_PROGRESS')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    const results = [];
    let checkedCount = 0;
    let fixedCount = 0;

    for (const cagnotte of cagnottes || []) {
      checkedCount++;

      // Recalculer le montant réellement collecté (source de vérité)
      const { data: sumData, error: sumError } = await supabase
        .from('cagnotte_contribution')
        .select('amount')
        .eq('cagnotte_id', cagnotte.id)
        .eq('status', 'SUCCEEDED');

      if (sumError) {
        console.error(`[check-hold-consistency] Erreur lecture contributions pour ${cagnotte.id}:`, sumError);
        results.push({ id: cagnotte.id, status: 'ERROR', error: sumError.message });
        continue;
      }

      const actualCollected = (sumData || []).reduce((sum: number, c: any) => sum + Number(c.amount), 0);
      const thresholdAmount = cagnotte.total_amount * cagnotte.hold_threshold_pct / 100;

      console.log(`[check-hold-consistency] Cagnotte ${cagnotte.id}: collected_db=${cagnotte.collected_amount}, actual=${actualCollected}, threshold=${thresholdAmount}`);

      // Vérifier si le seuil est atteint mais le HOLD n'est pas encore appliqué
      if (actualCollected >= thresholdAmount && !cagnotte.hold_started_at) {
        console.log(`[check-hold-consistency] Cagnotte ${cagnotte.id} devrait être en HOLD (${actualCollected}/${thresholdAmount})`);

        // Appeler la RPC update_cagnotte_progress pour corriger
        const { data: progressResult, error: updateError } = await supabase.rpc('update_cagnotte_progress', {
          p_cagnotte_id: cagnotte.id
        });

        if (updateError) {
          console.error(`[check-hold-consistency] Erreur update_cagnotte_progress:`, updateError);
          results.push({
            id: cagnotte.id,
            status: 'ERROR',
            error: updateError.message,
            collected: actualCollected,
            threshold: thresholdAmount
          });
        } else {
          console.log(`[check-hold-consistency] Cagnotte ${cagnotte.id} corrigée:`, progressResult);
          fixedCount++;
          results.push({
            id: cagnotte.id,
            status: 'FIXED',
            action: progressResult?.action || 'unknown',
            collected: actualCollected,
            threshold: thresholdAmount,
            field_availability_rows: progressResult?.field_availability_rows_updated
          });
        }
      } else if (actualCollected !== cagnotte.collected_amount) {
        // collected_amount décalé sans atteindre le seuil → corriger silencieusement
        const { error: fixError } = await supabase
          .from('cagnotte')
          .update({ collected_amount: actualCollected, updated_at: new Date().toISOString() })
          .eq('id', cagnotte.id);

        if (!fixError) {
          results.push({
            id: cagnotte.id,
            status: 'AMOUNT_FIXED',
            old_amount: cagnotte.collected_amount,
            actual_amount: actualCollected
          });
        }
      }
    }

    // 2. Vérifier les cagnottes en HOLD dont le field_availability n'est pas marqué
    const { data: holdCagnottes, error: holdError } = await supabase
      .from('cagnotte')
      .select('*')
      .eq('status', 'HOLD')
      .gt('hold_expires_at', new Date().toISOString());

    if (!holdError && holdCagnottes) {
      for (const cagnotte of holdCagnottes) {
        // Vérifier que field_availability est bien marqué
        const { data: slots, error: slotsError } = await supabase
          .from('field_availability')
          .select('id, on_hold_until, hold_cagnotte_id')
          .eq('field_id', cagnotte.field_id)
          .eq('date', cagnotte.slot_date)
          .gte('start_time', cagnotte.slot_start_time)
          .lt('start_time', cagnotte.slot_end_time);

        if (slotsError) continue;

        const unmarkedSlots = (slots || []).filter(
          (s: any) => !s.hold_cagnotte_id || s.hold_cagnotte_id !== cagnotte.id
        );

        if (unmarkedSlots.length > 0) {
          console.log(`[check-hold-consistency] Cagnotte HOLD ${cagnotte.id} a ${unmarkedSlots.length} slots non marqués, correction...`);

          // Corriger les slots non marqués
          const { error: fixSlotError } = await supabase
            .from('field_availability')
            .update({
              on_hold_until: cagnotte.hold_expires_at,
              hold_cagnotte_id: cagnotte.id
            })
            .eq('field_id', cagnotte.field_id)
            .eq('date', cagnotte.slot_date)
            .gte('start_time', cagnotte.slot_start_time)
            .lt('start_time', cagnotte.slot_end_time);

          if (!fixSlotError) {
            fixedCount++;
            results.push({
              id: cagnotte.id,
              status: 'SLOTS_FIXED',
              slots_fixed: unmarkedSlots.length,
              hold_expires_at: cagnotte.hold_expires_at
            });
          }
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
    console.error('[check-hold-consistency] Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
