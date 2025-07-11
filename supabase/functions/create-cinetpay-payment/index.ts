
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCorsPreFlight } from './cors.ts';
import { authenticateUser } from './auth.ts';
import { parseAndValidateRequest } from './validation.ts';
import { getBookingData, updateBookingPayment } from './database.ts';
import { getCinetPayConfig, createPaymentData, callCinetPayAPI } from './cinetpay.ts';
import type { PaymentResponse } from './types.ts';

serve(async (req) => {
  console.log('🚀 PHASE 2 - Edge Function create-cinetpay-payment');
  console.log('📋 Méthode:', req.method);
  console.log('📋 URL:', req.url);
  console.log('📋 Headers:', Object.fromEntries(req.headers.entries()));

  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  try {
    // Authentification
    const { user, supabaseClient } = await authenticateUser(req);

    // Validation des données
    const paymentData = await parseAndValidateRequest(req);
    const { booking_id, amount, field_name, date, time } = paymentData;

    // Récupération et vérification de la réservation
    const booking = await getBookingData(supabaseClient, booking_id, user.id);

    // Configuration CinetPay
    const cinetpayConfig = getCinetPayConfig();

    // Calculer les montants (commission de 5%)
    const platformFee = Math.round(amount * 0.05);
    const ownerAmount = amount - platformFee;

    console.log('💰 Phase 2 - Calcul montants:', { 
      amount, 
      platformFee, 
      ownerAmount,
      verificationBooking: booking.total_price
    });

    // Vérifier cohérence montant
    if (Math.abs(amount - booking.total_price) > 1) {
      console.warn('⚠️ Différence montant détectée:', {
        amountRequest: amount,
        amountBooking: booking.total_price,
        difference: Math.abs(amount - booking.total_price)
      });
    }

    // Créer la transaction CinetPay
    const transactionId = `escrow_${booking_id}_${Date.now()}`;
    
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovableproject.com');
    const returnUrl = `${baseUrl}/booking-success?session_id=booking_${booking_id}`;
    const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/cinetpay-webhook`;

    console.log('🔗 Phase 2 - URLs configurées:', {
      baseUrl,
      returnUrl,
      notifyUrl
    });

    // Préparer les données de paiement
    const cinetpayPaymentData = createPaymentData(
      cinetpayConfig,
      transactionId,
      amount,
      field_name,
      date,
      time,
      user,
      returnUrl,
      notifyUrl,
      booking_id
    );

    // Appeler l'API CinetPay
    const result = await callCinetPayAPI(cinetpayConfig, cinetpayPaymentData);

    // Mettre à jour la réservation
    await updateBookingPayment(supabaseClient, booking_id, transactionId, platformFee, ownerAmount);

    const responseData: PaymentResponse = {
      url: result.data.payment_url,
      transaction_id: transactionId,
      escrow_mode: true,
      confirmation_deadline: '24 heures après paiement',
      phase: 'Phase 2 - Corrections appliquées',
      amount: amount,
      currency: 'XOF'
    };

    console.log('🎉 Phase 2 - Succès complet - Envoi réponse:', responseData);

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('💥 ERREUR GLOBALE Phase 2 Edge Function:', error);
    console.error('💥 Stack trace Phase 2:', error.stack);
    console.error('💥 Type erreur:', typeof error);
    console.error('💥 Nom erreur:', error.name);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        function: 'create-cinetpay-payment',
        phase: 'Phase 2 - Diagnostic approfondi',
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
