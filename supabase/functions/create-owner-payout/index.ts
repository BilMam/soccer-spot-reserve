import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PayoutRequest {
  booking_id: string;
}
interface PayoutResponse {
  success: boolean;
  message: string;
  payout_id?: string;
  amount?: number;
  cinetpay_transfer_id?: string;
}

// Helper with timeout
const fetchWithTimeout = async (url: string, options: any, timeoutMs = 15000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (error: any) {
    clearTimeout(id);
    if (error?.name === 'AbortError') throw new Error(`Request timeout after ${timeoutMs}ms`);
    throw error;
  }
};

// Build Functions base from SUPABASE_URL (https://<ref>.supabase.co → https://<ref>.functions.supabase.co)
const getFunctionsBase = (supabaseUrl: string) => {
  const host = new URL(supabaseUrl).host; // <ref>.supabase.co
  const ref = host.split('.')[0];
  return `https://${ref}.functions.supabase.co`;
};

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [create-owner-payout] start`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Env
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const cinetpayTransferLogin = Deno.env.get('CINETPAY_TRANSFER_LOGIN');
    const cinetpayTransferPwd = Deno.env.get('CINETPAY_TRANSFER_PWD');

    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase configuration');

    const functionsBase = getFunctionsBase(supabaseUrl);

    const isTestMode = !cinetpayTransferLogin || !cinetpayTransferPwd;
    if (isTestMode) console.log(`[${timestamp}] ⚠️ TEST MODE: CinetPay credentials missing → simulate transfers`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Request body
    let body: PayoutRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ success: false, message: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const { booking_id } = body;
    if (!booking_id) {
      return new Response(JSON.stringify({ success: false, message: 'booking_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    console.log(`[${timestamp}] booking_id=${booking_id}`);

    // 1) Booking + owner
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        owner_amount,
        payment_status,
        payout_sent,
        fields!inner (
          id,
          name,
          owner_id,
          owners!inner (
            id,
            phone,
            cinetpay_contact_id
          )
        )
      `)
      .eq('id', booking_id)
      .eq('payment_status', 'paid')
      .single();

    if (bookingError || !bookingData) throw new Error(`Booking not found or not paid: ${bookingError?.message}`);

    const owner = bookingData.fields.owners;
    const ownerAmount = Math.round(Number(bookingData.owner_amount) || 0);
    if (!ownerAmount) throw new Error('owner_amount is zero or invalid');
    console.log(`[${timestamp}] owner=${owner.id} phone=${owner.phone} amount=${ownerAmount}`);

    // 2) Idempotence
    const { data: existingPayout } = await supabase
      .from('payouts')
      .select('id,status,amount_net')
      .eq('booking_id', booking_id)
      .maybeSingle();

    if (existingPayout?.status === 'completed') {
      const resp: PayoutResponse = {
        success: true,
        message: 'Payout already completed',
        payout_id: existingPayout.id,
        amount: existingPayout.amount_net
      };
      return new Response(JSON.stringify(resp), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else if (existingPayout) {
      console.log(`[${timestamp}] Retrying existing payout id=${existingPayout.id} status=${existingPayout.status}`);
    }

    // 3) Contact CinetPay requis
    const contactId = owner.cinetpay_contact_id as string | null;
    if (!contactId) throw new Error(`Owner ${owner.id} has no CinetPay contact_id`);

    // 4) Créer payout record si besoin
    let payoutId: string | undefined = existingPayout?.id;
    if (!existingPayout) {
      const { data: newPayout, error: payoutError } = await supabase
        .from('payouts')
        .insert({
          booking_id,
          owner_id: owner.id,
          amount: ownerAmount,
          amount_net: ownerAmount,
          status: 'pending'
        })
        .select('id')
        .single();

      if (payoutError) throw new Error(`Failed to create payout: ${payoutError.message}`);
      payoutId = newPayout.id;
      console.log(`[${timestamp}] payout created id=${payoutId}`);
    }

    // 5) Exécuter transfert
    let transferResult: any;
    let transferId: string | undefined;

    if (isTestMode) {
      transferResult = {
        code: '00',
        success: true,
        message: 'Transfer completed successfully (test mode)',
        transaction_id: `test_transfer_${payoutId}`,
        amount: ownerAmount
      };
      transferId = transferResult.transaction_id;
      console.log(`[${timestamp}] ⚠️ simulated transfer ${ownerAmount} XOF`);
    } else {
      try {
        // Auth
        const authRes = await fetchWithTimeout('https://api-money-transfer.cinetpay.com/v2/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login: cinetpayTransferLogin, password: cinetpayTransferPwd })
        });
        if (!authRes.ok) throw new Error(`CinetPay auth failed: ${authRes.status}`);
        const authData = await authRes.json();
        if (!authData?.success || !authData?.access_token) throw new Error(`CinetPay auth failed: ${authData?.message || 'no token'}`);

        // Transfer
        const transferData = {
          amount: ownerAmount,
          client_transaction_id: payoutId,
          contact_id: contactId,
          currency: 'XOF',
          description: `MySport payout - ${bookingData.fields.name}`,
          notify_url: `${functionsBase}/cinetpay-transfer-webhook`
        };

        const transferRes = await fetchWithTimeout('https://api-money-transfer.cinetpay.com/v2/transfer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authData.access_token}`
          },
          body: JSON.stringify(transferData)
        });

        transferResult = await transferRes.json();
        transferId = transferResult?.transaction_id;
        console.log(`[${timestamp}] transfer response`, transferResult);
      } catch (e: any) {
        console.error(`[${timestamp}] transfer error`, e);
        transferResult = { success: false, message: e?.message || 'transfer error', code: 'ERROR' };
      }
    }

    // 6) Mettre à jour payout
    const isOk = !!transferResult?.success && (transferResult?.code === '00' || transferResult?.code === 0);
    const newStatus = isOk ? 'completed' : 'failed';
    const { error: upErr } = await supabase
      .from('payouts')
      .update({
        status: newStatus,
        transfer_response: transferResult,
        cinetpay_transfer_id: transferId,
        updated_at: new Date().toISOString()
      })
      .eq('id', payoutId as string);
    if (upErr) console.error(`[${timestamp}] update payout error`, upErr);

    // 7) Marquer la booking si OK
    if (isOk) {
      const { error: bookErr } = await supabase.from('bookings').update({ payout_sent: true }).eq('id', booking_id);
      if (bookErr) console.error(`[${timestamp}] booking update error`, bookErr);
      else console.log(`[${timestamp}] ✅ payout completed`);
    }

    const response: PayoutResponse = {
      success: !!transferResult?.success,
      message: transferResult?.message || `Payout ${newStatus}`,
      payout_id: payoutId,
      amount: ownerAmount,
      cinetpay_transfer_id: transferId
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error(`[${timestamp}] fatal`, error);
    return new Response(JSON.stringify({
      success: false,
      message: error?.message ?? 'Unexpected error',
      timestamp
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
