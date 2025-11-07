import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYDUNYA_API_BASE = 'https://app.paydunya.com/api/v2';
const MAX_REFUND_ATTEMPTS = 5; // Nombre maximum de tentatives de remboursement

/**
 * Détecte le provider mobile money basé sur le préfixe du numéro de téléphone (Côte d'Ivoire)
 * @param phoneNumber - Numéro de téléphone (peut contenir +225 ou non)
 * @returns Le code du provider pour PayDunya API
 */
function detectWithdrawMode(phoneNumber: string): string {
  // Nettoyer le numéro (enlever espaces, tirets, parenthèses)
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // Extraire les 2 premiers chiffres après l'indicatif
  let prefix = '';
  
  if (cleaned.startsWith('+225')) {
    prefix = cleaned.substring(4, 6);
  } else if (cleaned.startsWith('225')) {
    prefix = cleaned.substring(3, 5);
  } else if (cleaned.startsWith('00225')) {
    prefix = cleaned.substring(5, 7);
  } else {
    // Numéro local sans indicatif
    prefix = cleaned.substring(0, 2);
  }
  
  console.log(`[detectWithdrawMode] Numéro: ${phoneNumber}, Préfixe: ${prefix}`);
  
  // Préfixes Côte d'Ivoire
  if (prefix === '07' || prefix === '70') {
    // Wave CI utilise 07 et 70
    return 'wave-ci';
  } else if (prefix === '08' || prefix === '09' || prefix === '17' || prefix === '47' || prefix === '57' || prefix === '67' || prefix === '77' || prefix === '87' || prefix === '97') {
    return 'orange-money-ci';
  } else if (prefix === '05' || prefix === '06' || prefix === '15' || prefix === '25' || prefix === '45' || prefix === '55' || prefix === '65' || prefix === '75' || prefix === '85' || prefix === '95') {
    return 'mtn-ci';
  } else if (prefix === '01' || prefix === '02' || prefix === '03') {
    return 'moov-ci';
  }
  
  // Par défaut, Orange Money (le plus répandu)
  console.warn(`[detectWithdrawMode] ⚠️ Préfixe inconnu: ${prefix}, utilisation de Orange Money par défaut`);
  return 'orange-money-ci';
}

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

        // Récupérer le numéro de téléphone depuis les métadonnées stockées
        console.log(`[process-cagnotte-refunds] 📞 Extraction du numéro depuis metadata`);
        
        let msisdn = contrib.metadata?.payer_phone_e164;

        if (!msisdn) {
          console.error('[process-cagnotte-refunds] ❌ Numéro non disponible dans metadata', {
            contributionId,
            metadata: contrib.metadata,
            payer_phone_masked: contrib.payer_phone_masked
          });

          await supabase
            .from('cagnotte_contribution')
            .update({
              refund_status: 'FAILED',
              refund_last_attempt_at: new Date().toISOString(),
              refund_last_error: 'Numéro de téléphone non disponible dans les métadonnées. Contribution effectuée avant la mise à jour.',
              refund_attempt_count: (contrib.refund_attempt_count ?? 0) + 1,
              refund_metadata: contrib.metadata,
              updated_at: new Date().toISOString(),
            })
            .eq('id', contributionId);

          results.push({
            id: contributionId,
            status: 'FAILED',
            error: 'Numéro de téléphone non disponible - Contribution antérieure',
          });

          continue; // Passer à la contribution suivante
        }
        
        // Nettoyer le numéro (retirer +225 si présent pour avoir le format local)
        msisdn = msisdn.replace(/^\+225/, '').replace(/\s/g, '');

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

        // Détecter automatiquement le provider mobile money
        const withdrawMode = detectWithdrawMode(msisdn);
        console.log(`[process-cagnotte-refunds] 📱 Provider détecté: ${withdrawMode}`);

        // ÉTAPE 1 : Créer l'invoice de déboursement via PayDunya v2
        console.log(`[process-cagnotte-refunds] 💸 Création invoice déboursement: ${amount} XOF vers ${msisdn}`);
        
        const getInvoicePayload = {
          account_alias: msisdn,
          amount: amount,
          withdraw_mode: withdrawMode,
          callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paydunya-ipn`
        };

        const getInvoiceResponse = await fetch(
          `${PAYDUNYA_API_BASE}/disburse/get-invoice`,
          {
            method: 'POST',
            headers: {
              'PAYDUNYA-MASTER-KEY': paydunyaMasterKey,
              'PAYDUNYA-PRIVATE-KEY': paydunyaPrivateKey,
              'PAYDUNYA-TOKEN': paydunyaToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(getInvoicePayload),
          }
        );

        if (!getInvoiceResponse.ok) {
          const errorText = await getInvoiceResponse.text();
          throw new Error(`Erreur création invoice: ${getInvoiceResponse.status} - ${errorText}`);
        }

          const disburseInvoiceData = await getInvoiceResponse.json();
          console.log(`[process-cagnotte-refunds] 📄 Réponse invoice:`, disburseInvoiceData);

          if (disburseInvoiceData.response_code !== '00') {
            throw new Error(`Erreur invoice: ${disburseInvoiceData.response_text || 'Code: ' + disburseInvoiceData.response_code}`);
          }

          const disburseToken = disburseInvoiceData.disburse_token;
        if (!disburseToken) {
          throw new Error('disburse_token manquant dans la réponse PayDunya');
        }

        console.log(`[process-cagnotte-refunds] ✅ Invoice créée: ${disburseToken}`);

        // ÉTAPE 2 : Soumettre l'invoice pour exécution
        console.log(`[process-cagnotte-refunds] 📤 Soumission déboursement...`);
        
        // Générer un disburse_id unique pour chaque tentative (évite "disburse_id already used")
        const disburseId = `${contributionId}_${Date.now()}`;
        
        const submitPayload = {
          disburse_invoice: disburseToken,
          disburse_id: disburseId // Notre référence interne unique
        };

        const submitResponse = await fetch(
          `${PAYDUNYA_API_BASE}/disburse/submit-invoice`,
          {
            method: 'POST',
            headers: {
              'PAYDUNYA-MASTER-KEY': paydunyaMasterKey,
              'PAYDUNYA-PRIVATE-KEY': paydunyaPrivateKey,
              'PAYDUNYA-TOKEN': paydunyaToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(submitPayload),
          }
        );

        if (!submitResponse.ok) {
          const errorText = await submitResponse.text();
          throw new Error(`Erreur soumission: ${submitResponse.status} - ${errorText}`);
        }

        const disbursementData = await submitResponse.json();
        console.log(`[process-cagnotte-refunds] ✅ Déboursement soumis:`, disbursementData);

        if (disbursementData.response_code !== '00') {
          throw new Error(`Erreur déboursement: ${disbursementData.response_text || 'Code: ' + disbursementData.response_code}`);
        }

        const refundReference = disbursementData.transaction_id || disbursementData.disburse_invoice || disburseToken;

        if (!refundReference) {
          throw new Error('Référence de remboursement introuvable dans la réponse PayDunya');
        }

        // Analyser le statut retourné par PayDunya
        const disbursementStatus = disbursementData.status || 'pending';
        let refundStatus = 'PROCESSING';

        if (disbursementStatus === 'success' || disbursementStatus === 'completed') {
          refundStatus = 'REFUNDED';
        } else if (disbursementStatus === 'failed' || disbursementStatus === 'cancelled') {
          refundStatus = 'FAILED';
        } else if (disbursementStatus === 'pending' || disbursementStatus === 'processing') {
          refundStatus = 'PROCESSING';
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
