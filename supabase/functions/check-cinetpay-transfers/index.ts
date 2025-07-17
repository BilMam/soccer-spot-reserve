import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CinetPayAuthResponse {
  code: string;
  message: string;
  data: { token: string };
}

interface CinetPayCheckResponse {
  code: string;
  message: string;
  data?: {
    treatment_status: string;
    operator_transaction_id?: string;
    amount: number;
    currency: string;
    treatment_date: string;
  };
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [check-cinetpay-transfers] Function started`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment variables
    const transferLogin = Deno.env.get('CINETPAY_TRANSFER_LOGIN');
    const transferPwd = Deno.env.get('CINETPAY_TRANSFER_PWD');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!transferLogin || !transferPwd || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuration manquante');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending payouts
    const { data: pendingPayouts, error: payoutsError } = await supabase
      .from('payouts')
      .select('*')
      .eq('status', 'pending')
      .not('cinetpay_transfer_id', 'is', null);

    if (payoutsError) {
      throw new Error(`Erreur récupération payouts: ${payoutsError.message}`);
    }

    if (!pendingPayouts || pendingPayouts.length === 0) {
      console.log(`[${timestamp}] [check-cinetpay-transfers] No pending payouts found`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Aucun payout en attente',
          checked: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${timestamp}] [check-cinetpay-transfers] Found ${pendingPayouts.length} pending payouts`);

    // Authenticate with CinetPay
    const authResponse = await fetch('https://client.cinetpay.com/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: transferLogin,
        password: transferPwd
      })
    });

    const authResult: CinetPayAuthResponse = await authResponse.json();
    if (authResult.code !== 'OPERATION_SUCCES') {
      throw new Error(`Échec authentification: ${authResult.message}`);
    }

    const token = authResult.data.token;
    let updatedCount = 0;

    // Check each pending payout
    for (const payout of pendingPayouts) {
      try {
        console.log(`[${timestamp}] [check-cinetpay-transfers] Checking payout: ${payout.cinetpay_transfer_id}`);

        const checkResponse = await fetch(`https://client.cinetpay.com/v1/transfer/check/money?token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ 
            client_transaction_id: payout.cinetpay_transfer_id 
          })
        });

        const checkResult: CinetPayCheckResponse = await checkResponse.json();
        console.log(`[${timestamp}] [check-cinetpay-transfers] Check result for ${payout.cinetpay_transfer_id}:`, checkResult);

        if (checkResult.code === 'OPERATION_SUCCES' && checkResult.data) {
          let newStatus: string;
          if (checkResult.data.treatment_status === 'VAL') {
            newStatus = 'paid';
          } else if (checkResult.data.treatment_status === 'REJ') {
            newStatus = 'failed';
          } else {
            continue; // Still pending
          }

          // Update payout status
          const { error: updateError } = await supabase
            .from('payouts')
            .update({
              status: newStatus,
              transfer_response: checkResult.data,
              updated_at: new Date().toISOString()
            })
            .eq('id', payout.id);

          if (updateError) {
            console.error(`[${timestamp}] [check-cinetpay-transfers] Update failed for ${payout.id}:`, updateError);
          } else {
            updatedCount++;
            console.log(`[${timestamp}] [check-cinetpay-transfers] Updated payout ${payout.id} to ${newStatus}`);
          }
        }

      } catch (error) {
        console.error(`[${timestamp}] [check-cinetpay-transfers] Error checking ${payout.cinetpay_transfer_id}:`, error);
      }
    }

    console.log(`[${timestamp}] [check-cinetpay-transfers] Checked ${pendingPayouts.length} payouts, updated ${updatedCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Vérification terminée',
        checked: pendingPayouts.length,
        updated: updatedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[${timestamp}] [check-cinetpay-transfers] Error:`, error);
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