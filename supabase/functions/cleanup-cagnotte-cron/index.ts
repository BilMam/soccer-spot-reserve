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

    const { data, error } = await supabase.rpc('cleanup_expired_cagnottes');

    if (error) {
      console.error('[cleanup-cagnotte-cron] RPC error:', error);
      throw error;
    }

    console.log('[cleanup-cagnotte-cron] Cleanup completed:', {
      cleaned_count: data?.[0]?.cleaned_count || 0,
      refund_count: data?.[0]?.refund_count || 0
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        cleaned_count: data?.[0]?.cleaned_count || 0,
        refund_count: data?.[0]?.refund_count || 0
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
