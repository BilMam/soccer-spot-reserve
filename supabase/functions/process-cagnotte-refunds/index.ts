import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYDUNYA_API_BASE = 'https://app.paydunya.com/api/v1';
const MAX_REFUND_ATTEMPTS = 5; // Nombre maximum de tentatives de remboursement

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Charger les 3 clés PayDunya distinctement
    const paydunyaMasterKey = Deno.env.get('PAYDUNYA_MASTER_KEY');
    const paydunyaPrivateKey = Deno.env.get('PAYDUNYA_PRIVATE_KEY');
    const paydunyaToken = Deno.env.get('PAYDUNYA_TOKEN');
    const paydunyaMode = Deno.env.get('PAYDUNYA_MODE') || 'live'; // 'test' ou 'live'

    if (!paydunyaMasterKey || !paydunyaPrivateKey || !paydunyaToken) {
      throw new Error('PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY ou PAYDUNYA_TOKEN manquant');
    }

    console.log(`[process-cagnotte-refunds] 🔄 Démarrage du traitement des remboursements... (mode: ${paydunyaMode})`);

    // Récupérer les contributions à rembourser (PENDING, FAILED ou PROCESSING avec moins de 5 tentatives)
    const { data: contributions, error } = await supabase
      .from('cagnotte_contribution')
      .select(`
        *,
        cagnotte:cagnotte(
          id,
          status,
          field_id,
          slot_date,
          slot_start_time,
          cancellation_reason
        )
      `)
      .in('refund_status', ['PENDING', 'FAILED', 'PROCESSING'])
      .lt('refund_attempt_count', MAX_REFUND_ATTEMPTS)
      .eq('status', 'SUCCEEDED'); // Seules les contributions réussies sont remboursables

    if (error) {
      console.error('[process-cagnotte-refunds] ❌ Erreur récupération contributions:', error);
      throw error;
    }

    if (!contributions || contributions.length === 0) {
      console.log('[process-cagnotte-refunds] ✅ Aucune contribution à rembourser');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'Aucune contribution à rembourser' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[process-cagnotte-refunds] 📋 ${contributions.length} contribution(s) à traiter`);

    const results = [];

    for (const contrib of contributions) {
      try {
        const contributionId = contrib.id;
        const pspTxId = contrib.psp_tx_id;
        const amount = contrib.amount;

        console.log(`[process-cagnotte-refunds] 💰 Traitement contribution ${contributionId} - ${amount} XOF`);

        // Vérifier l'idempotence : si refund_reference existe déjà, vérifier le statut
        if (contrib.refund_reference) {
          console.log(`[process-cagnotte-refunds] ℹ️ Contribution ${contributionId} a déjà une référence: ${contrib.refund_reference}`);
          
          // Vérifier le statut du remboursement existant
          try {
            const statusResponse = await fetch(
              `${PAYDUNYA_API_BASE}/disbursements/${contrib.refund_reference}`,
              {
                method: 'GET',
                headers: {
                  'PAYDUNYA-MASTER-KEY': paydunyaMasterKey,
                  'PAYDUNYA-PRIVATE-KEY': paydunyaPrivateKey,
                  'PAYDUNYA-TOKEN': paydunyaToken,
                  'PAYDUNYA-MODE': paydunyaMode,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              console.log(`[process-cagnotte-refunds] Statut remboursement existant:`, statusData);

              // Mettre à jour selon le statut PayDunya
              if (statusData.status === 'completed' || statusData.status === 'success') {
                await supabase
                  .from('cagnotte_contribution')
                  .update({
                    refund_status: 'REFUNDED',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', contributionId);

                // Vérifier si la cagnotte peut être marquée comme REFUNDED
                await supabase.rpc('update_cagnotte_refund_status', {
                  p_cagnotte_id: contrib.cagnotte_id
                });

                results.push({ id: contributionId, status: 'REFUNDED', reference: contrib.refund_reference });
              } else if (statusData.status === 'failed' || statusData.status === 'cancelled') {
                // Réinitialiser pour réessayer avec une nouvelle tentative
                console.log(`[process-cagnotte-refunds] 🔄 Remboursement échoué, réinitialisation pour réessai`);
                
                await supabase
                  .from('cagnotte_contribution')
                  .update({
                    refund_status: 'PENDING',
                    refund_reference: null,
                    refund_attempt_count: contrib.refund_attempt_count + 1,
                    refund_last_error: `PayDunya status: ${statusData.status}`,
                    refund_last_attempt_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', contributionId);

                results.push({ id: contributionId, status: 'RETRY_SCHEDULED', error: statusData.status });
              } else if (statusData.status === 'pending' || statusData.status === 'processing') {
                // Toujours en cours, pas de changement
                console.log(`[process-cagnotte-refunds] ⏳ Remboursement toujours en cours`);
                results.push({ id: contributionId, status: 'PROCESSING', reference: contrib.refund_reference });
              }
            }
          } catch (statusError) {
            console.error(`[process-cagnotte-refunds] ⚠️ Erreur vérification statut:`, statusError);
          }

          continue; // Passer à la contribution suivante
        }

        // Récupérer le numéro de téléphone du payeur via l'API PayDunya
        console.log(`[process-cagnotte-refunds] 📞 Récupération du numéro pour invoice: ${pspTxId}`);
        
            const invoiceResponse = await fetch(
          `${PAYDUNYA_API_BASE}/checkout-invoice/confirm/${pspTxId}`,
          {
            method: 'GET',
            headers: {
              'PAYDUNYA-MASTER-KEY': paydunyaMasterKey,
              'PAYDUNYA-PRIVATE-KEY': paydunyaPrivateKey,
              'PAYDUNYA-TOKEN': paydunyaToken,
              'PAYDUNYA-MODE': paydunyaMode,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!invoiceResponse.ok) {
          const errorText = await invoiceResponse.text();
          throw new Error(`Erreur récupération invoice: ${invoiceResponse.status} - ${errorText}`);
        }

        const invoiceData = await invoiceResponse.json();
        const msisdn = invoiceData.customer?.phone || invoiceData.customer?.msisdn;

        if (!msisdn) {
          throw new Error('Numéro de téléphone introuvable dans les données de l\'invoice');
        }

        console.log(`[process-cagnotte-refunds] ✅ Numéro récupéré: ${msisdn}`);

        // Incrémenter le compteur de tentatives
        await supabase
          .from('cagnotte_contribution')
          .update({
            refund_attempt_count: contrib.refund_attempt_count + 1,
            refund_last_attempt_at: new Date().toISOString(),
            refund_status: 'PROCESSING',
            updated_at: new Date().toISOString(),
          })
          .eq('id', contributionId);

        // Envoyer le déboursement via PayDunya
        console.log(`[process-cagnotte-refunds] 💸 Envoi déboursement: ${amount} XOF vers ${msisdn}`);
        
        const disbursementPayload = {
          account_alias: msisdn,
          amount: amount,
          withdraw_mode: 'mobile_money', // ou 'bank' selon le contexte
          description: `Remboursement cagnotte - Raison: ${contrib.cagnotte?.cancellation_reason || 'Annulation'}`,
        };

        const disbursementResponse = await fetch(
          `${PAYDUNYA_API_BASE}/disbursements`,
          {
            method: 'POST',
            headers: {
              'PAYDUNYA-MASTER-KEY': paydunyaMasterKey,
              'PAYDUNYA-PRIVATE-KEY': paydunyaPrivateKey,
              'PAYDUNYA-TOKEN': paydunyaToken,
              'PAYDUNYA-MODE': paydunyaMode,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(disbursementPayload),
          }
        );

        if (!disbursementResponse.ok) {
          const errorText = await disbursementResponse.text();
          throw new Error(`Erreur déboursement: ${disbursementResponse.status} - ${errorText}`);
        }

        const disbursementData = await disbursementResponse.json();
        console.log(`[process-cagnotte-refunds] ✅ Déboursement créé:`, disbursementData);

        const refundReference = disbursementData.transaction_id || disbursementData.reference || disbursementData.id;

        if (!refundReference) {
          throw new Error('Référence de remboursement introuvable dans la réponse PayDunya');
        }

        // Mettre à jour la contribution avec la référence et le statut
        const disbursementStatus = disbursementData.status || disbursementData.transaction_status;
        let refundStatus = 'PROCESSING';

        // Si le statut est immédiatement confirmé
        if (disbursementStatus === 'completed' || disbursementStatus === 'success') {
          refundStatus = 'REFUNDED';
        } else if (disbursementStatus === 'failed' || disbursementStatus === 'cancelled') {
          refundStatus = 'FAILED';
        }

        await supabase
          .from('cagnotte_contribution')
          .update({
            refund_reference: refundReference,
            refund_status: refundStatus,
            refund_last_error: null, // Réinitialiser l'erreur en cas de succès
            updated_at: new Date().toISOString(),
          })
          .eq('id', contributionId);

        // Si le remboursement est déjà confirmé, vérifier si la cagnotte peut être marquée comme REFUNDED
        if (refundStatus === 'REFUNDED') {
          await supabase.rpc('update_cagnotte_refund_status', {
            p_cagnotte_id: contrib.cagnotte_id
          });
        }

        results.push({
          id: contributionId,
          status: refundStatus,
          reference: refundReference,
          amount: amount,
        });

        console.log(`[process-cagnotte-refunds] ✅ Contribution ${contributionId} traitée: ${refundStatus}`);

      } catch (err: any) {
        console.error(`[process-cagnotte-refunds] ❌ Erreur traitement contribution ${contrib.id}:`, err);

        // Mettre à jour avec l'erreur
        await supabase
          .from('cagnotte_contribution')
          .update({
            refund_status: 'FAILED',
            refund_last_error: err.message || 'Erreur inconnue',
            refund_last_attempt_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', contrib.id);

        results.push({
          id: contrib.id,
          status: 'FAILED',
          error: err.message,
        });
      }
    }

    console.log('[process-cagnotte-refunds] 🏁 Traitement terminé');

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[process-cagnotte-refunds] 💥 Erreur fatale:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
