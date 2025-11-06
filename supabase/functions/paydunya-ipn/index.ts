// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function toHex(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha512(text: string) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-512", data);
  return toHex(buf);
}

serve(async (req) => {
  console.log('🎯 WEBHOOK PAYDUNYA DÉCLENCHÉ!', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    user_agent: req.headers.get('user-agent'),
    content_type: req.headers.get('content-type'),
    origin: req.headers.get('origin'),
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const ct = req.headers.get("content-type") || "";
    let payload: any = {};
    
    try {
      if (ct.includes("application/x-www-form-urlencoded")) {
        payload = Object.fromEntries(new URLSearchParams(await req.text()));
      } else if (ct.includes("application/json")) {
        payload = await req.json();
      } else {
        try { 
          payload = await req.json(); 
        } catch { 
          payload = { raw: await req.text() }; 
        }
      }
    } catch (_) {
      payload = {};
    }

    console.log("[paydunya-ipn] Raw payload received:", {
      contentType: ct,
      keys: Object.keys(payload || {}),
      payload: payload
    });

    // Fonction pour normaliser et hasher le numéro de téléphone (multi-pays E.164)
    async function normalizeAndHashPhone(msisdn: string): Promise<{ e164: string; hash: string; masked: string } | null> {
      if (!msisdn) return null;
      
      // Nettoyer le numéro
      let clean = msisdn.replace(/[\s\-\(\)]/g, '');
      
      // Normaliser en E.164
      // Si commence par 00, remplacer par +
      if (clean.startsWith('00')) {
        clean = '+' + clean.substring(2);
      }
      // Si commence par + déjà, OK
      else if (clean.startsWith('+')) {
        // OK, already E.164
      }
      // Si commence par un chiffre sans +, essayer de détecter le pays
      // Pour CI: si commence par 0, remplacer par +225
      else if (clean.startsWith('0') && clean.length <= 10) {
        clean = '+225' + clean.substring(1);
      }
      // Si pas de +, assumer CI par défaut pour retro-compatibilité
      else if (!clean.startsWith('+')) {
        clean = '+225' + clean;
      }
      
      // Valider que c'est un format E.164 raisonnable (+XXX...)
      if (!/^\+[1-9]\d{6,14}$/.test(clean)) {
        console.warn('[paydunya-ipn] Invalid E.164 format:', clean);
        return null;
      }
      
      const e164 = clean;
      
      // Créer le hash SHA256
      const encoder = new TextEncoder();
      const data = encoder.encode(e164);
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Masquer le numéro (garder les 2 derniers chiffres)
      const digits = e164.replace(/\D/g, '');
      const masked = '****' + digits.slice(-2);
      
      return { e164, hash: hashHex, masked };
    }

    // PayDunya envoie les données sous forme data[...] dans form-urlencoded
    // Il faut extraire les valeurs correctement
    let status: string | undefined;
    let paydunyaInvoiceToken: string | undefined;
    let internalInvoiceToken: string | null = null;
    let total_amount, msisdn;
    
    if (payload['data[status]']) {
      // Format form-urlencoded avec clés data[...]
      status = payload['data[status]'];
      paydunyaInvoiceToken = payload['data[invoice][token]']
        || payload['data[token]']
        || payload['token'];
      internalInvoiceToken = payload['data[custom_data][invoice_token]'] || null;
      total_amount = payload['data[invoice][total_amount]'];
      msisdn = payload['data[customer][phone]'] || payload['data[customer][msisdn]'];
    } else if (payload.data) {
      // Format JSON avec objet data
      status = payload.data.status;
      paydunyaInvoiceToken = payload.data.invoice?.token
        || payload.data.token;
      internalInvoiceToken = payload.data.custom_data?.invoice_token ?? null;
      total_amount = payload.data.invoice?.total_amount;
      msisdn = payload.data.customer?.phone || payload.data.customer?.msisdn;
    } else {
      // Format direct
      status = payload.status;
      paydunyaInvoiceToken = payload.invoice?.token
        || payload.invoice_token
        || payload.token;
      internalInvoiceToken = payload.custom_data?.invoice_token ?? null;
      total_amount = payload.total_amount;
      msisdn = payload.customer_phone || payload.msisdn;
    }

    // Si aucun jeton PSP n'est trouvé, on passe en dernier recours le jeton interne
    if (!paydunyaInvoiceToken && internalInvoiceToken) {
      console.log('[paydunya-ipn] ⚠️ Utilisation du token custom_data en dernier recours');
      paydunyaInvoiceToken = internalInvoiceToken;
    }

    console.log(`[paydunya-ipn] 🧾 Token sélectionné: ${paydunyaInvoiceToken} (interne: ${internalInvoiceToken ?? 'aucun'})`);

    if (!paydunyaInvoiceToken) {
      console.error('🚨 AUCUN TOKEN TROUVÉ DANS LE WEBHOOK PayDunya!');
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const master = Deno.env.get("PAYDUNYA_MASTER_KEY") ?? "";
    const privateKey = Deno.env.get("PAYDUNYA_PRIVATE_KEY") ?? "";
    const paydunyaToken = Deno.env.get("PAYDUNYA_TOKEN") ?? "";
    const receivedHash = (payload['data[hash]'] || payload.hash || payload.signature || "").toString().toLowerCase();
    const expected = master ? (await sha512(master)).toLowerCase() : "";
    const hashVerified = Boolean(master) && Boolean(receivedHash) && receivedHash === expected;

    // Extraire et normaliser à la fois le statut racine et le statut de l'invoice
    const rawStatus = (status ?? '').toString().trim();
    const invoiceStatus = (
      payload['data[invoice][status]'] ??
      payload.data?.invoice?.status ??
      ''
    ).toString().trim();
    let normalizedStatus = (invoiceStatus || rawStatus).toLowerCase();

    // Listes étendues de statuts
    const successStatuses = ['completed', 'success', 'succeeded', 'successful', 'accepted'];
    const pendingStatuses = ['pending', 'processing', 'en attente', 'en_attente', 'waiting'];

    console.log('[paydunya-ipn] Statuts reçus:', {
      rawStatus,
      invoiceStatus,
      normalizedStatus
    });

    // Extraire custom_data pour détecter les contributions cagnotte
    let customData: any = null;
    if (payload['data[custom_data][cagnotte_id]']) {
      customData = {
        cagnotte_id: payload['data[custom_data][cagnotte_id]'],
        contribution_amount: payload['data[custom_data][contribution_amount]'],
        team: payload['data[custom_data][team]'],
        invoice_token: payload['data[custom_data][invoice_token]'],
        user_id: payload['data[custom_data][user_id]'] || null
      };
    } else if (payload.data?.custom_data) {
      customData = payload.data.custom_data;
    } else if (payload.custom_data) {
      customData = payload.custom_data;
    }

    // Synchroniser internalInvoiceToken avec custom_data si disponible
    if (!internalInvoiceToken && customData?.invoice_token) {
      internalInvoiceToken = customData.invoice_token;
    }

    // Détecter le type de webhook : disbursement (remboursement) ou invoice (paiement)
    const isDisbursementWebhook = payload.transaction_type === 'disbursement' || 
                                   payload['data[transaction_type]'] === 'disbursement' ||
                                   payload.data?.transaction_type === 'disbursement';

    // Traiter les webhooks de remboursement (disbursements)
    if (isDisbursementWebhook) {
      console.log('[paydunya-ipn] 💸 Webhook de remboursement détecté');
      
      const disbursementRef = payload.transaction_id || 
                              payload['data[transaction_id]'] || 
                              payload.data?.transaction_id ||
                              payload.reference ||
                              payload['data[reference]'] ||
                              payload.data?.reference;
      
      const disbursementStatusRaw = payload.status || 
                                     payload['data[status]'] || 
                                     payload.data?.status;
      const disbursementStatus = (disbursementStatusRaw || '').toLowerCase();

      if (!disbursementRef) {
        console.error('[paydunya-ipn] ⚠️ Référence de remboursement manquante');
        return new Response('OK', { headers: corsHeaders });
      }

      console.log(`[paydunya-ipn] Remboursement ${disbursementRef} - Statut: ${disbursementStatus}`);

      // Trouver la contribution correspondante
      const { data: contribution, error: findError } = await supabaseClient
        .from('cagnotte_contribution')
        .select('id, cagnotte_id, amount, refund_status')
        .eq('refund_reference', disbursementRef)
        .maybeSingle();

      if (findError) {
        console.error('[paydunya-ipn] ❌ Erreur recherche contribution:', findError);
        return new Response('OK', { headers: corsHeaders });
      }

      if (!contribution) {
        console.log(`[paydunya-ipn] ℹ️ Aucune contribution trouvée pour le remboursement ${disbursementRef}`);
        return new Response('OK', { headers: corsHeaders });
      }

      // Mettre à jour le statut selon la notification PayDunya
      let newRefundStatus = contribution.refund_status;

      if (successStatuses.includes(disbursementStatus)) {
        newRefundStatus = 'REFUNDED';
        console.log(`[paydunya-ipn] ✅ Remboursement confirmé pour contribution ${contribution.id}`);
      } else if (['failed', 'cancelled', 'échec', 'echoue'].includes(disbursementStatus)) {
        newRefundStatus = 'FAILED';
        console.log(`[paydunya-ipn] ❌ Remboursement échoué pour contribution ${contribution.id}`);
      } else if (pendingStatuses.includes(disbursementStatus)) {
        newRefundStatus = 'PROCESSING';
        console.log(`[paydunya-ipn] ⏳ Remboursement en cours pour contribution ${contribution.id}`);
      }

      // Mettre à jour la contribution
      const { error: updateError } = await supabaseClient
        .from('cagnotte_contribution')
        .update({
          refund_status: newRefundStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contribution.id);

      if (updateError) {
        console.error('[paydunya-ipn] ❌ Erreur mise à jour contribution:', updateError);
      }

      // Si le remboursement est confirmé, vérifier si la cagnotte peut être marquée comme REFUNDED
      if (newRefundStatus === 'REFUNDED') {
        const { error: rpcError } = await supabaseClient.rpc('update_cagnotte_refund_status', {
          p_cagnotte_id: contribution.cagnotte_id
        });

        if (rpcError) {
          console.error('[paydunya-ipn] ❌ Erreur update_cagnotte_refund_status:', rpcError);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          contribution_id: contribution.id,
          refund_status: newRefundStatus 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier si c'est une contribution cagnotte
    const isCagnotteContribution = customData?.cagnotte_id;

    if (isCagnotteContribution) {
      console.log('[paydunya-ipn] 💰 Contribution cagnotte détectée:', {
        cagnotte_id: customData.cagnotte_id,
        contribution_amount: customData.contribution_amount,
        team: customData.team
      });

      // Vérifier que le paiement est réussi
      if (!successStatuses.includes(normalizedStatus)) {
        console.log('[paydunya-ipn] Paiement cagnotte non réussi, status:', normalizedStatus);
        return new Response('OK', { headers: corsHeaders });
      }

      // Extraire et normaliser le numéro du payeur
      let phoneData = null;
      if (msisdn) {
        try {
          phoneData = await normalizeAndHashPhone(msisdn);
          console.log('[paydunya-ipn] Numéro normalisé:', phoneData ? `${phoneData.masked} (E.164: ${phoneData.e164})` : 'invalid');
        } catch (err) {
          console.warn('[paydunya-ipn] Erreur normalisation numéro:', err);
        }
      }

      // Préparer les métadonnées
      const metadata: any = {
        instrument_type: 'mobile_money'
      };
      
      if (phoneData) {
        metadata.payer_phone_hash = phoneData.hash;
        metadata.payer_phone_masked = phoneData.masked;
      }

      // Ajouter le token interne aux métadonnées si disponible
      const contributionMetadata: any = { ...metadata };
      if (internalInvoiceToken) {
        contributionMetadata.internal_invoice_token = internalInvoiceToken;
      }

      // Appeler contribute_to_cagnotte avec métadonnées et user_id
      const { data: contributeResult, error: contributeError } = await supabaseClient.rpc(
        'contribute_to_cagnotte',
        {
          p_cagnotte_id: customData.cagnotte_id,
          p_amount: parseFloat(customData.contribution_amount),
          p_team: customData.team || null,
          p_psp_tx_id: paydunyaInvoiceToken,
          p_method: 'PAYDUNYA',
          p_metadata: contributionMetadata,
          p_user_id: customData.user_id || null  // Passer l'utilisateur connecté
        }
      );

      if (contributeError) {
        console.error('[paydunya-ipn] ❌ Erreur contribute_to_cagnotte:', contributeError);
        
        await supabaseClient.from('payment_anomalies').insert({
          payment_intent_id: paydunyaInvoiceToken,
          amount: parseInt(total_amount || '0'),
          error_type: 'cagnotte_contribution_failed',
          error_message: contributeError.message,
          webhook_data: payload
        });

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Erreur lors de la contribution' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('[paydunya-ipn] ✅ Contribution enregistrée avec succès:', contributeResult);

      return new Response(
        JSON.stringify({
          success: true,
          cagnotte_status: contributeResult.cagnotte_status,
          collected_amount: contributeResult.collected_amount,
          progress_pct: contributeResult.progress_pct
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sinon, c'est une réservation classique
    // Vérifier avec PayDunya si le statut est pending
    if (pendingStatuses.includes(normalizedStatus) && master && privateKey && paydunyaToken) {
      try {
        console.log('[paydunya-ipn] Vérification du statut auprès de PayDunya...');
        const confirmRes = await fetch(`https://app.paydunya.com/api/v1/checkout-invoice/confirm/${paydunyaInvoiceToken}`, {
          headers: {
            'PAYDUNYA-MASTER-KEY': master,
            'PAYDUNYA-PRIVATE-KEY': privateKey,
            'PAYDUNYA-TOKEN': paydunyaToken
          }
        });
        const confirmData = await confirmRes.json();
        const confirmStatus = (confirmData?.invoice?.status || '').toLowerCase();
        console.log('[paydunya-ipn] Fallback confirmation status:', confirmStatus);
        if (successStatuses.includes(confirmStatus)) {
          normalizedStatus = 'completed';
        }
      } catch (error) {
        console.error('[paydunya-ipn] Erreur lors de la vérification PayDunya:', error);
      }
    }

    let bookingStatus = 'cancelled';
    let paymentStatus = 'failed';

    if (successStatuses.includes(normalizedStatus)) {
      bookingStatus = 'confirmed';
      paymentStatus = 'paid';
      console.log('🔥 PAIEMENT PAYDUNYA CONFIRMÉ - Créneau bloqué définitivement');
    } else if (pendingStatuses.includes(normalizedStatus)) {
      bookingStatus = 'pending';
      paymentStatus = 'pending';
      console.log('⏳ PAIEMENT PAYDUNYA EN ATTENTE - Créneau en attente de confirmation');
    } else {
      console.log('💥 PAIEMENT PAYDUNYA ÉCHOUÉ - Créneau immédiatement libre');
    }

    // Find booking by payment_intent_id (paydunyaInvoiceToken)
    let { data: bookingRow } = await supabaseClient
      .from('bookings')
      .select('id, status, payment_status, payment_intent_id')
      .eq('payment_intent_id', paydunyaInvoiceToken)
      .maybeSingle();

    // Fallback: chercher par booking_id dans custom_data si pas trouvé
    if (!bookingRow && customData?.booking_id) {
      console.log('[paydunya-ipn] 🔍 Tentative de recherche par custom_data.booking_id:', customData.booking_id);
      
      const { data: fallbackBooking } = await supabaseClient
        .from('bookings')
        .select('id, status, payment_status, payment_intent_id')
        .eq('id', customData.booking_id)
        .maybeSingle();
      
      if (fallbackBooking) {
        // Ne synchroniser que si payment_intent_id est vide ou égal au token interne
        if (!fallbackBooking.payment_intent_id || fallbackBooking.payment_intent_id === internalInvoiceToken) {
          console.log('[paydunya-ipn] ✅ Réservation trouvée via booking_id, synchronisation du token réel');
          
          await supabaseClient
            .from('bookings')
            .update({ 
              payment_intent_id: paydunyaInvoiceToken,
              updated_at: new Date().toISOString()
            })
            .eq('id', fallbackBooking.id);
        } else {
          console.log('[paydunya-ipn] ℹ️ Token existant conservé car déjà renseigné avec un token PSP');
        }
        
        bookingRow = fallbackBooking;
      }
    }

    if (!bookingRow) {
      console.error('🚨 AUCUNE RÉSERVATION TROUVÉE POUR CE PAIEMENT PayDunya!');
      console.error('Invoice Token:', paydunyaInvoiceToken);
      console.error('Custom Data:', customData);
      
      // Log anomaly for monitoring
      await supabaseClient.from('payment_anomalies').insert({
        payment_intent_id: paydunyaInvoiceToken,
        amount: parseInt(total_amount || '0'),
        error_type: 'no_booking_found_paydunya',
        error_message: 'No booking found for this PayDunya invoice_token or custom_data.booking_id',
        webhook_data: payload
      });
      
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    console.log(`[WEBHOOK] Booking found:`, bookingRow);

    // Update booking
    const { data: booking, error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        status: bookingStatus,
        payment_status: paymentStatus,
        paid_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingRow.id)
      .select('id')
      .single();

    console.log(`✅ Réservation mise à jour: ${booking?.id} → ${bookingStatus}/${paymentStatus}`);

    if (updateError) {
      console.error('Erreur mise à jour réservation:', updateError);
      throw updateError;
    }

    // Trigger automatic payout if payment confirmed
    let payoutTriggered = false;
    if (paymentStatus === 'paid' && booking) {
      console.log(`💰 Déclenchement payout automatique PayDunya pour booking ${booking.id}`);
      try {
        const { data: payoutResult, error: payoutError } = await supabaseClient.functions.invoke('create-paydunya-payout', {
          body: { booking_id: booking.id }
        });

        if (payoutError) {
          console.error('❌ Erreur déclenchement payout PayDunya:', payoutError);
        } else {
          console.log('✅ Payout PayDunya déclenché avec succès:', payoutResult);
          payoutTriggered = true;
        }
      } catch (payoutError) {
        console.error('❌ Erreur payout PayDunya:', payoutError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking_id: booking?.id, 
        status: bookingStatus,
        payout_triggered: payoutTriggered
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ ERREUR WEBHOOK PAYDUNYA CRITIQUE:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Enregistrer l'erreur pour diagnostic
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      
      await supabaseClient.from('payment_anomalies').insert({
        payment_intent_id: 'webhook_error_paydunya',
        amount: 0,
        error_type: 'webhook_processing_error_paydunya',
        error_message: error.message,
        webhook_data: { error_stack: error.stack, timestamp: new Date().toISOString() }
      });
    } catch (logError) {
      console.error('Failed to log PayDunya webhook error:', logError);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
