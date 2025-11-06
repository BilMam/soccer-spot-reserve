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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const masterKey = Deno.env.get("PAYDUNYA_MASTER_KEY") ?? '';
    const privateKey = Deno.env.get("PAYDUNYA_PRIVATE_KEY") ?? '';
    const token = Deno.env.get("PAYDUNYA_TOKEN") ?? '';
    const mode = Deno.env.get("PAYDUNYA_MODE") ?? 'live';

    console.log('[repair-pending-bookings] 🔍 Recherche des réservations pending...');

    // Récupérer toutes les réservations pending
    const { data: pendingBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'pending')
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    if (fetchError) {
      console.error('[repair-pending-bookings] ❌ Erreur fetch:', fetchError);
      throw fetchError;
    }

    console.log(`[repair-pending-bookings] 📋 ${pendingBookings?.length || 0} réservations pending trouvées`);

    const results = [];

    for (const booking of pendingBookings || []) {
      console.log(`[repair-pending-bookings] 🔧 Traitement booking ${booking.id}...`);

      // Chercher le token PayDunya dans payment_anomalies
      const { data: anomalies } = await supabase
        .from('payment_anomalies')
        .select('payment_intent_id, webhook_data')
        .eq('error_type', 'no_booking_found_paydunya')
        .like('webhook_data', `%${booking.id}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!anomalies || anomalies.length === 0) {
        console.log(`[repair-pending-bookings] ⚠️ Aucune anomalie trouvée pour ${booking.id}`);
        
        // Essayer d'utiliser le payment_intent_id existant
        if (booking.payment_intent_id && !booking.payment_intent_id.startsWith('invoice_')) {
          const realToken = booking.payment_intent_id;
          
          // Vérifier le statut avec PayDunya
          try {
            const confirmRes = await fetch(
              `https://app.paydunya.com/api/v1/checkout-invoice/confirm/${realToken}`,
              {
                headers: {
                  'PAYDUNYA-MASTER-KEY': masterKey,
                  'PAYDUNYA-PRIVATE-KEY': privateKey,
                  'PAYDUNYA-TOKEN': token,
                  'PAYDUNYA-MODE': mode
                }
              }
            );

            const confirmData = await confirmRes.json();
            const confirmStatus = (confirmData?.invoice?.status || '').toLowerCase();
            const confirmCode = confirmData?.response_code;

            console.log(`[repair-pending-bookings] 📡 PayDunya confirm response:`, { confirmStatus, confirmCode });

            if (confirmCode === '00' && 
                ['completed', 'success', 'succeeded'].includes(confirmStatus)) {
              
              // Paiement confirmé ! Mettre à jour la réservation
              const { error: updateError } = await supabase
                .from('bookings')
                .update({
                  status: 'confirmed',
                  payment_status: 'paid',
                  paid_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', booking.id);

              if (updateError) {
                console.error(`[repair-pending-bookings] ❌ Erreur update:`, updateError);
                results.push({
                  booking_id: booking.id,
                  status: 'update_error',
                  error: updateError.message
                });
              } else {
                console.log(`[repair-pending-bookings] ✅ Booking ${booking.id} réparé avec token existant`);
                results.push({
                  booking_id: booking.id,
                  status: 'repaired',
                  real_token: realToken
                });
              }
            } else {
              results.push({
                booking_id: booking.id,
                status: 'payment_not_confirmed',
                paydunya_status: confirmStatus,
                response_code: confirmCode
              });
            }
          } catch (error) {
            console.error(`[repair-pending-bookings] ❌ Erreur API PayDunya:`, error);
            results.push({
              booking_id: booking.id,
              status: 'api_error',
              error: error.message
            });
          }
        } else {
          results.push({
            booking_id: booking.id,
            status: 'no_anomaly_and_invalid_token'
          });
        }
        continue;
      }

      const realToken = anomalies[0].payment_intent_id;
      console.log(`[repair-pending-bookings] 🎫 Token trouvé dans anomalies: ${realToken}`);

      // Vérifier le statut avec PayDunya
      try {
        const confirmRes = await fetch(
          `https://app.paydunya.com/api/v1/checkout-invoice/confirm/${realToken}`,
          {
            headers: {
              'PAYDUNYA-MASTER-KEY': masterKey,
              'PAYDUNYA-PRIVATE-KEY': privateKey,
              'PAYDUNYA-TOKEN': token,
              'PAYDUNYA-MODE': mode
            }
          }
        );

        const confirmData = await confirmRes.json();
        const confirmStatus = (confirmData?.invoice?.status || '').toLowerCase();
        const confirmCode = confirmData?.response_code;

        console.log(`[repair-pending-bookings] 📡 PayDunya confirm response:`, { confirmStatus, confirmCode });

        if (confirmCode === '00' && 
            ['completed', 'success', 'succeeded'].includes(confirmStatus)) {
          
          // Paiement confirmé ! Mettre à jour la réservation
          const { error: updateError } = await supabase
            .from('bookings')
            .update({
              status: 'confirmed',
              payment_status: 'paid',
              payment_intent_id: realToken,
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', booking.id);

          if (updateError) {
            console.error(`[repair-pending-bookings] ❌ Erreur update:`, updateError);
            results.push({
              booking_id: booking.id,
              status: 'update_error',
              error: updateError.message
            });
          } else {
            console.log(`[repair-pending-bookings] ✅ Booking ${booking.id} réparé avec succès`);
            results.push({
              booking_id: booking.id,
              status: 'repaired',
              real_token: realToken
            });
          }
        } else {
          results.push({
            booking_id: booking.id,
            status: 'payment_not_confirmed',
            paydunya_status: confirmStatus,
            response_code: confirmCode
          });
        }
      } catch (error) {
        console.error(`[repair-pending-bookings] ❌ Erreur API PayDunya:`, error);
        results.push({
          booking_id: booking.id,
          status: 'api_error',
          error: error.message
        });
      }
    }

    console.log('[repair-pending-bookings] 🎉 Traitement terminé');

    return new Response(JSON.stringify({
      processed: pendingBookings?.length || 0,
      results,
      summary: {
        repaired: results.filter(r => r.status === 'repaired').length,
        not_confirmed: results.filter(r => r.status === 'payment_not_confirmed').length,
        errors: results.filter(r => r.status.includes('error')).length,
        no_anomaly: results.filter(r => r.status.includes('no_anomaly')).length
      }
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[repair-pending-bookings] ❌ Erreur globale:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        function: 'repair-pending-bookings'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
