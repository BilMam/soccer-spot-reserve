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
      
      // Si déjà complété, pas besoin de retenter
      if (existingPayout.status === 'completed') {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Payout already completed',
            payout_id: existingPayout.id,
            amount: existingPayout.amount_net
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
      
      // 🔄 RETRY pour les statuts pending, waiting_funds, failed
      if (['pending', 'waiting_funds', 'failed'].includes(existingPayout.status)) {
        console.log(`[${timestamp}] [create-owner-payout] Retrying payout with status: ${existingPayout.status}`);
        // Continue avec le processus de transfert
      }
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
      description: `Payout réservation ${field.name} - ${booking.id.slice(-8)}`,
      notify_url: `${supabaseUrl}/functions/v1/cinetpay-transfer-webhook`
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

    // Gérer le statut selon la réponse CinetPay
    let payoutStatus = 'pending';
    if (transferResult.status === 'success') {
      payoutStatus = 'pending'; // En attente de confirmation
    } else if (transferResult.code === '603') {
      payoutStatus = 'waiting_funds'; // Solde insuffisant, retry plus tard
    } else {
      payoutStatus = 'failed';
    }

    // Créer ou mettre à jour l'enregistrement payout
    const payoutData = {
      booking_id: booking.id,
      owner_id: owner.id,
      amount: amountNet,
      amount_net: amountNet,
      platform_fee_owner: booking.platform_fee_owner,
      status: payoutStatus,
      cinetpay_transfer_id: transferResult.client_transaction_id || transferResult.transaction_id,
      transfer_response: transferResult,
      updated_at: new Date().toISOString()
    };

    let payout;
    if (existingPayout) {
      // Mettre à jour le payout existant
      const { data: updatedPayout, error: updateError } = await supabase
        .from('payouts')
        .update(payoutData)
        .eq('id', existingPayout.id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      payout = updatedPayout;
    } else {
      // Créer un nouveau payout
      const { data: newPayout, error: createError } = await supabase
        .from('payouts')
        .insert(payoutData)
        .select()
        .single();
      
      if (createError) {
        console.error(`[${timestamp}] [create-owner-payout] Payout creation failed:`, createError);
        throw new Error('Échec création payout');
      }
      payout = newPayout;
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