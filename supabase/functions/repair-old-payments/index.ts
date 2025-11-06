// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYDUNYA_API_BASE = 'https://app.paydunya.com/api/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔧 Démarrage script de rattrapage paiements PayDunya`);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const masterKey = Deno.env.get('PAYDUNYA_MASTER_KEY') ?? '';
    const privateKey = Deno.env.get('PAYDUNYA_PRIVATE_KEY') ?? '';
    const token = Deno.env.get('PAYDUNYA_TOKEN') ?? '';
    const mode = Deno.env.get('PAYDUNYA_MODE') || 'live';

    if (!masterKey || !privateKey || !token) {
      throw new Error('Clés PayDunya manquantes');
    }

    // Lister les anomalies non résolues
    const { data: anomalies, error: anomaliesError } = await supabaseClient
      .from('payment_anomalies')
      .select('*')
      .eq('error_type', 'no_booking_found_paydunya')
      .is('resolved_at', null);

    if (anomaliesError) {
      throw anomaliesError;
    }

    console.log(`[${timestamp}] 📋 ${anomalies?.length || 0} anomalies à traiter`);

    const results = {
      processed: 0,
      confirmed: 0,
      stillPending: 0,
      errors: 0,
      details: [] as any[]
    };

    for (const anomaly of anomalies || []) {
      const anomalyLog = {
        anomaly_id: anomaly.id,
        payment_intent_id: anomaly.payment_intent_id,
        status: 'processing',
        message: ''
      };

      try {
        // Extraire booking_id et invoice_token depuis webhook_data
        const webhookData = anomaly.webhook_data || {};
        let bookingId = webhookData['data[custom_data][booking_id]'] 
          || webhookData.data?.custom_data?.booking_id 
          || webhookData.custom_data?.booking_id;
        
        let invoiceToken = webhookData['data[custom_data][invoice_token]'] 
          || webhookData['data[invoice][token]']
          || webhookData.data?.custom_data?.invoice_token 
          || webhookData.data?.invoice?.token
          || webhookData.invoice?.token
          || anomaly.payment_intent_id;

        console.log(`[${timestamp}] 🔍 Traitement anomalie ${anomaly.id}`, {
          bookingId,
          invoiceToken,
          hasWebhookData: !!webhookData
        });

        if (!invoiceToken) {
          anomalyLog.status = 'skipped';
          anomalyLog.message = 'Invoice token introuvable';
          results.details.push(anomalyLog);
          continue;
        }

        // Si on n'a pas de booking_id, essayer de trouver la réservation par l'ancien payment_intent_id
        if (!bookingId) {
          const { data: booking } = await supabaseClient
            .from('bookings')
            .select('id')
            .eq('payment_intent_id', anomaly.payment_intent_id)
            .maybeSingle();
          
          if (booking) {
            bookingId = booking.id;
            console.log(`[${timestamp}] ✅ Booking trouvé par payment_intent_id: ${bookingId}`);
          }
        }

        if (!bookingId) {
          anomalyLog.status = 'skipped';
          anomalyLog.message = 'Booking ID introuvable';
          results.details.push(anomalyLog);
          continue;
        }

        // Vérifier que la réservation existe et est en attente
        const { data: booking, error: bookingError } = await supabaseClient
          .from('bookings')
          .select('id, status, payment_status, payment_intent_id')
          .eq('id', bookingId)
          .maybeSingle();

        if (bookingError || !booking) {
          anomalyLog.status = 'error';
          anomalyLog.message = `Réservation ${bookingId} non trouvée`;
          results.errors++;
          results.details.push(anomalyLog);
          continue;
        }

        console.log(`[${timestamp}] 📦 Réservation ${bookingId} trouvée:`, {
          status: booking.status,
          payment_status: booking.payment_status,
          current_intent_id: booking.payment_intent_id
        });

        // Synchroniser le token PayDunya
        if (booking.payment_intent_id !== invoiceToken) {
          const { error: updateTokenError } = await supabaseClient
            .from('bookings')
            .update({
              payment_intent_id: invoiceToken,
              updated_at: new Date().toISOString()
            })
            .eq('id', bookingId);

          if (updateTokenError) {
            console.error(`[${timestamp}] ❌ Erreur sync token:`, updateTokenError);
          } else {
            console.log(`[${timestamp}] ✅ Token synchronisé: ${invoiceToken}`);
          }
        }

        // Vérifier le statut PayDunya si la réservation est toujours en attente
        if (booking.status === 'pending' || booking.payment_status === 'pending') {
          console.log(`[${timestamp}] 🔍 Vérification statut PayDunya...`);

          const paydunyaResponse = await fetch(
            `${PAYDUNYA_API_BASE}/checkout-invoice/confirm/${invoiceToken}`,
            {
              method: 'GET',
              headers: {
                'PAYDUNYA-MASTER-KEY': masterKey,
                'PAYDUNYA-PRIVATE-KEY': privateKey,
                'PAYDUNYA-TOKEN': token,
                'PAYDUNYA-MODE': mode,
                'Content-Type': 'application/json',
              },
            }
          );

          const paydunyaData = await paydunyaResponse.json();
          console.log(`[${timestamp}] 📄 Réponse PayDunya:`, {
            response_code: paydunyaData.response_code,
            status: paydunyaData.status
          });

          const isSuccess = paydunyaData.response_code === '00' || 
            ['completed', 'success'].includes((paydunyaData.status || '').toLowerCase());

          if (isSuccess) {
            // Mettre à jour la réservation en confirmed
            const { error: confirmError } = await supabaseClient
              .from('bookings')
              .update({
                status: 'confirmed',
                payment_status: 'paid',
                paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', bookingId);

            if (confirmError) {
              console.error(`[${timestamp}] ❌ Erreur confirmation:`, confirmError);
              anomalyLog.status = 'error';
              anomalyLog.message = `Erreur confirmation: ${confirmError.message}`;
              results.errors++;
            } else {
              console.log(`[${timestamp}] ✅ Réservation ${bookingId} confirmée`);
              
              // Déclencher le payout automatique
              try {
                await supabaseClient.functions.invoke('create-paydunya-payout', {
                  body: { booking_id: bookingId }
                });
                console.log(`[${timestamp}] 💰 Payout déclenché pour ${bookingId}`);
              } catch (payoutError) {
                console.error(`[${timestamp}] ⚠️ Erreur payout:`, payoutError);
              }

              anomalyLog.status = 'confirmed';
              anomalyLog.message = 'Paiement confirmé et créneau bloqué';
              results.confirmed++;
            }
          } else {
            anomalyLog.status = 'still_pending';
            anomalyLog.message = `Paiement toujours en attente (${paydunyaData.status})`;
            results.stillPending++;
          }
        } else {
          anomalyLog.status = 'already_confirmed';
          anomalyLog.message = `Réservation déjà ${booking.status}`;
        }

        // Marquer l'anomalie comme résolue
        await supabaseClient
          .from('payment_anomalies')
          .update({ resolved_at: new Date().toISOString() })
          .eq('id', anomaly.id);

        results.processed++;
        results.details.push(anomalyLog);

      } catch (error) {
        console.error(`[${timestamp}] ❌ Erreur traitement anomalie ${anomaly.id}:`, error);
        anomalyLog.status = 'error';
        anomalyLog.message = error.message;
        results.errors++;
        results.details.push(anomalyLog);

        // Marquer quand même comme résolu pour éviter de retraiter
        await supabaseClient
          .from('payment_anomalies')
          .update({ resolved_at: new Date().toISOString() })
          .eq('id', anomaly.id);
      }
    }

    console.log(`[${timestamp}] ✅ Script terminé:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          processed: results.processed,
          confirmed: results.confirmed,
          stillPending: results.stillPending,
          errors: results.errors
        },
        details: results.details
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error(`[${timestamp}] ❌ Erreur critique:`, error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
