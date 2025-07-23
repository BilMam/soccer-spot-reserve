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

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [create-owner-payout] Function started`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const cinetpayTransferLogin = Deno.env.get('CINETPAY_TRANSFER_LOGIN');
    const cinetpayTransferPwd = Deno.env.get('CINETPAY_TRANSFER_PWD');

    if (!supabaseUrl || !supabaseServiceKey || !cinetpayTransferLogin || !cinetpayTransferPwd) {
      throw new Error('Configuration manquante');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { booking_id }: PayoutRequest = await req.json();

    console.log(`[${timestamp}] [create-owner-payout] Processing booking:`, booking_id);

    // Idempotence: vérifier si un payout existe déjà
    const { data: existingPayout } = await supabase
      .from('payouts')
      .select('id, status, amount_net')
      .eq('booking_id', booking_id)
      .single();

    if (existingPayout) {
      console.log(`[${timestamp}] [create-owner-payout] Payout already exists:`, existingPayout);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payout already processed',
          payout_id: existingPayout.id,
          amount: existingPayout.amount_net
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Récupérer les détails de la réservation et du propriétaire
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        field_price,
        platform_fee_owner,
        owner_amount,
        payment_status,
        payout_sent,
        field_id,
        fields!inner(
          id,
          name,
          owner_id,
          owners!inner(
            id,
            user_id,
            payout_accounts!inner(
              id,
              phone,
              is_active
            )
          )
        )
      `)
      .eq('id', booking_id)
      .eq('payment_status', 'paid')
      .eq('payout_sent', false)
      .single();

    if (bookingError || !booking) {
      console.error(`[${timestamp}] [create-owner-payout] Booking not found or not eligible:`, bookingError);
      throw new Error('Réservation non trouvée ou non éligible au payout');
    }

    const field = booking.fields;
    const owner = field.owners;
    const payoutAccount = owner.payout_accounts.find((acc: any) => acc.is_active);

    if (!payoutAccount) {
      throw new Error('Aucun compte de paiement actif trouvé pour le propriétaire');
    }

    // Calculer le montant net à transférer (95% du prix terrain)
    const amountNet = booking.owner_amount;
    
    console.log(`[${timestamp}] [create-owner-payout] Transfer details:`, {
      owner_id: owner.id,
      amount_net: amountNet,
      phone: payoutAccount.phone,
      field_name: field.name
    });

    // Appeler l'API CinetPay Transfer
    const transferData = {
      login: cinetpayTransferLogin,
      password: cinetpayTransferPwd,
      phone: payoutAccount.phone,
      amount: amountNet,
      description: `Payout réservation ${field.name} - ${booking.id.slice(-8)}`
    };

    console.log(`[${timestamp}] [create-owner-payout] CinetPay transfer request:`, {
      ...transferData,
      password: '***'
    });

    const transferResponse = await fetch('https://api.cinetpay.com/v1/transfer/money/send/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transferData)
    });

    const transferResult = await transferResponse.json();
    console.log(`[${timestamp}] [create-owner-payout] CinetPay transfer response:`, transferResult);

    if (!transferResponse.ok || transferResult.status !== 'success') {
      throw new Error(`Échec transfert CinetPay: ${transferResult.message || 'Unknown error'}`);
    }

    // Créer l'enregistrement payout
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert({
        booking_id: booking.id,
        owner_id: owner.user_id,
        amount: amountNet,
        amount_net: amountNet,
        platform_fee_owner: booking.platform_fee_owner,
        cinetpay_transfer_id: transferResult.transaction_id || transferResult.data?.transaction_id,
        status: 'pending',
        transfer_response: transferResult,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (payoutError) {
      console.error(`[${timestamp}] [create-owner-payout] Payout creation failed:`, payoutError);
      throw new Error('Échec création payout');
    }

    // Marquer la réservation comme ayant son payout traité
    await supabase
      .from('bookings')
      .update({
        payout_sent: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking.id);

    console.log(`[${timestamp}] [create-owner-payout] Payout created successfully:`, payout);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payout créé avec succès',
        payout_id: payout.id,
        amount: amountNet,
        cinetpay_transfer_id: payout.cinetpay_transfer_id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error(`[${timestamp}] [create-owner-payout] Error:`, error);
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