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

    console.log('[cleanup-cagnotte-cron] Starting cleanup...');

    // Appeler la fonction de nettoyage (retourne void maintenant)
    const { error } = await supabase.rpc('cleanup_expired_cagnottes');

    if (error) {
      console.error('[cleanup-cagnotte-cron] RPC error:', error);
      throw error;
    }

    console.log('[cleanup-cagnotte-cron] Cleanup completed successfully');

    // Appeler la fonction de traitement des remboursements
    try {
      const { data: refundData, error: refundError } = await supabase.functions.invoke('process-cagnotte-refunds');
      
      if (refundError) {
        console.error('[cleanup-cagnotte-cron] Refund processing error:', refundError);
      } else {
        console.log('[cleanup-cagnotte-cron] Refunds processed:', refundData);
      }
    } catch (refundErr) {
      console.error('[cleanup-cagnotte-cron] Error invoking refund function:', refundErr);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Cleanup and refund processing completed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[cleanup-cagnotte-cron] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
