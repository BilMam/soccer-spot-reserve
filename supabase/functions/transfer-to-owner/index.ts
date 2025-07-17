import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CinetPayAuthResponse {
  code: string;
  message: string;
  description: string;
  data: {
    token: string;
  };
}

interface CinetPayTransferResponse {
  code: string;
  message: string;
  description: string;
  data?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Transfer to owner function started');

    // Get environment variables
    const transferLogin = Deno.env.get('CINETPAY_TRANSFER_LOGIN');
    const transferPwd = Deno.env.get('CINETPAY_TRANSFER_PWD');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!transferLogin || !transferPwd || !supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing environment variables');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Configuration CinetPay Transfer manquante' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { booking_id } = await req.json();
    console.log('📋 Processing transfer for booking:', booking_id);

    if (!booking_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'booking_id requis' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get booking details with field and owner info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        fields (
          owner_id,
          name,
          price_per_hour
        )
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('❌ Erreur récupération booking:', bookingError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Réservation non trouvée' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if booking is confirmed and paid
    if (booking.status !== 'confirmed' || booking.payment_status !== 'completed') {
      console.log('⏸️ Booking not ready for transfer:', { 
        status: booking.status, 
        payment_status: booking.payment_status 
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Réservation non confirmée ou paiement non finalisé' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if transfer already done
    if (booking.stripe_transfer_id) {
      console.log('✅ Transfer already completed:', booking.stripe_transfer_id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Transfert déjà effectué',
          transfer_id: booking.stripe_transfer_id
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get owner contact info
    const { data: paymentAccount, error: accountError } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('owner_id', booking.fields.owner_id)
      .eq('payment_provider', 'cinetpay')
      .single();

    if (accountError || !paymentAccount || !paymentAccount.cinetpay_contact_added) {
      console.error('❌ Contact propriétaire non configuré:', accountError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Contact propriétaire non configuré dans CinetPay' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 1: Authenticate with CinetPay Transfer API
    console.log('🔐 Authenticating with CinetPay Transfer API...');
    const authResponse = await fetch('https://client.cinetpay.com/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        login: transferLogin,
        password: transferPwd
      })
    });

    const authResult: CinetPayAuthResponse = await authResponse.json();
    console.log('🔐 Auth response:', authResult);

    if (authResult.code !== 'OPERATION_SUCCES') {
      console.error('❌ Authentication failed:', authResult.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Échec authentification CinetPay: ${authResult.message}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = authResult.data.token;

    // Step 2: Perform transfer
    console.log('💸 Performing transfer to owner...');
    const transferAmount = booking.owner_amount || (booking.total_price - (booking.platform_fee || 0));
    
    const transferData = {
      amount: Math.round(transferAmount),
      prefix: paymentAccount.country_prefix || '225',
      phone: paymentAccount.phone,
      transaction_id: `transfer_${booking_id}_${Date.now()}`,
      description: `Paiement terrain ${booking.fields.name} - ${booking.booking_date}`
    };

    console.log('💸 Transfer data:', transferData);

    const transferResponse = await fetch(`https://client.cinetpay.com/v1/transfer/money?token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transferData)
    });

    const transferResult: CinetPayTransferResponse = await transferResponse.json();
    console.log('💸 Transfer response:', transferResult);

    // Update booking with transfer info
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        stripe_transfer_id: transferData.transaction_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id);

    if (updateError) {
      console.error('❌ Erreur mise à jour booking:', updateError);
    }

    if (transferResult.code === 'OPERATION_SUCCES') {
      console.log('✅ Transfer successful');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Transfert effectué avec succès',
          transfer_id: transferData.transaction_id,
          amount: transferAmount
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      console.error('❌ Transfer failed:', transferResult.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Échec transfert: ${transferResult.message}`,
          transfer_response: transferResult
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Erreur système: ${error.message}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});