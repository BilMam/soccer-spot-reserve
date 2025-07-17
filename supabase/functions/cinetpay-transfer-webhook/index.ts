import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CinetPayTransferWebhookData {
  treatment_status: string;
  client_transaction_id: string;
  operator_transaction_id?: string;
  amount: number;
  currency: string;
  operator_name: string;
  phone: string;
  treatment_date: string;
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [cinetpay-transfer-webhook] Function started`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuration Supabase manquante');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const webhookData: CinetPayTransferWebhookData = await req.json();

    console.log(`[${timestamp}] [cinetpay-transfer-webhook] Webhook data:`, webhookData);

    const { treatment_status, client_transaction_id } = webhookData;

    // Update payout status based on treatment_status
    let newStatus: string;
    if (treatment_status === 'VAL') {
      newStatus = 'paid';
    } else if (treatment_status === 'REJ') {
      newStatus = 'failed';
    } else {
      newStatus = 'pending';
    }

    console.log(`[${timestamp}] [cinetpay-transfer-webhook] Updating payout status to: ${newStatus}`);

    // Update payout record
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .update({
        status: newStatus,
        transfer_response: webhookData,
        updated_at: new Date().toISOString()
      })
      .eq('cinetpay_transfer_id', client_transaction_id)
      .select()
      .single();

    if (payoutError) {
      console.error(`[${timestamp}] [cinetpay-transfer-webhook] Payout update failed:`, payoutError);
      throw new Error('Échec mise à jour payout');
    }

    console.log(`[${timestamp}] [cinetpay-transfer-webhook] Payout updated successfully:`, payout);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook traité avec succès',
        payout_id: payout?.id,
        status: newStatus
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error(`[${timestamp}] [cinetpay-transfer-webhook] Error:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message,
        timestamp 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});