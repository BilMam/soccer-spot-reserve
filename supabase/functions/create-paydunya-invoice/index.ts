// Version: 2025-01-13-v2 - Force redeploy with ANON_KEY auth fix
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentData {
  booking_id: string;
  amount: number;
  field_name: string;
  date: string;
  time: string;
  return_url?: string;
  cancel_url?: string;
}

interface PaymentResponse {
  url: string;
  invoice_token: string;
  amount_checkout: number;
  field_price: number;
  platform_fee_user: number;
  platform_fee_owner: number;
  owner_amount: number;
  currency: string;
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [create-paydunya-invoice] Function started`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment variables avec des noms plus clairs
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    // Vérifier plusieurs variantes possibles des clés PayDunya
    const paydunyaMasterKey = Deno.env.get('PAYDUNYA_MASTER_KEY') || 
                              Deno.env.get('PAYDUNYA_MASTER_KEY_PROD') ||
                              Deno.env.get('PAYDUNYA_PRODUCTION_MASTER_KEY');
    
    const paydunyaPrivateKey = Deno.env.get('PAYDUNYA_PRIVATE_KEY') || 
                               Deno.env.get('PAYDUNYA_PRIVATE_KEY_PROD') ||
                               Deno.env.get('PAYDUNYA_PRODUCTION_PRIVATE_KEY');
    
    const paydunyaToken = Deno.env.get('PAYDUNYA_TOKEN') || 
                          Deno.env.get('PAYDUNYA_TOKEN_PROD') ||
                          Deno.env.get('PAYDUNYA_PRODUCTION_TOKEN');
    
    const paydunyaMode = Deno.env.get('PAYDUNYA_MODE') || 'live';

    console.log(`[${timestamp}] Environment check:`, {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseServiceKey: !!supabaseServiceKey,
      hasPaydunyaMasterKey: !!paydunyaMasterKey,
      hasPaydunyaPrivateKey: !!paydunyaPrivateKey,
      hasPaydunyaToken: !!paydunyaToken,
      paydunyaMode,
      // Debug: vérifier les valeurs exactes (masquées)
      masterKeyLength: paydunyaMasterKey?.length,
      privateKeyLength: paydunyaPrivateKey?.length,
      tokenLength: paydunyaToken?.length
    });

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Configuration Supabase manquante');
    }

    if (!paydunyaMasterKey || !paydunyaPrivateKey || !paydunyaToken) {
      console.error(`[${timestamp}] Missing PayDunya keys:`, {
        masterKey: paydunyaMasterKey ? 'Present' : 'Missing',
        privateKey: paydunyaPrivateKey ? 'Present' : 'Missing',
        token: paydunyaToken ? 'Present' : 'Missing'
      });
      throw new Error('Configuration PayDunya manquante - Vérifiez vos clés API dans les secrets Supabase');
    }

    // Authentication avec ANON_KEY (comme dans initiate-cagnotte-payment)
    const authHeader = req.headers.get('Authorization');
    let currentUserId: string | null = null;

    if (authHeader) {
      const supabaseAuth = createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          global: {
            headers: { Authorization: authHeader }
          }
        }
      );
      
      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentification échouée: ' + (userError?.message || 'Utilisateur non trouvé'));
      }
      currentUserId = user.id;
    } else {
      throw new Error('Authorization header manquant');
    }

    // Créer un client avec service role pour les opérations DB
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request data
    const paymentData: PaymentData = await req.json();
    const { booking_id, amount, field_name, date, time, return_url, cancel_url } = paymentData;

    console.log(`[${timestamp}] [create-paydunya-invoice] Payment data:`, paymentData);

    // Get booking from database - MODIFICATION 1: Récupérer les champs promo
    const { data: existingBooking, error: bookingFetchError } = await supabaseClient
      .from('bookings')
      .select('field_id, user_id, field_price, platform_fee_owner, owner_amount, promo_code_id, booking_date, start_time, end_time')
      .eq('id', booking_id)
      .maybeSingle();

    if (bookingFetchError || !existingBooking) {
      throw new Error('Réservation introuvable');
    }

    // Verify user owns this booking
    if (existingBooking.user_id !== currentUserId) {
      throw new Error('Accès non autorisé à cette réservation');
    }

    // Vérifier conflit avec TOUTES les cagnottes HOLD/CONFIRMED (filet de sécurité backend)
    const { data: conflictingCagnottes } = await supabaseClient
      .from('cagnotte')
      .select('id,status,slot_start_time,slot_end_time')
      .eq('field_id', existingBooking.field_id)
      .eq('slot_date', existingBooking.booking_date)
      .in('status', ['HOLD','CONFIRMED']);

    const overlap = (aS:string, aE:string, bS:string, bE:string) => (aS < bE && aE > bS);

    // Boucler sur chaque cagnotte et vérifier le chevauchement
    if (conflictingCagnottes && conflictingCagnottes.length > 0) {
      for (const cagnotte of conflictingCagnottes) {
        if (overlap(
          existingBooking.start_time, 
          existingBooking.end_time,
          cagnotte.slot_start_time,  
          cagnotte.slot_end_time
        )) {
          console.error(`[${timestamp}] Conflit avec cagnotte ${cagnotte.status}:`, cagnotte.id);
          return new Response(
            JSON.stringify({
              code: "CAGNOTTE_BLOCKED",
              error: "Ce créneau est temporairement réservé par une cagnotte d'équipe."
            }),
            { 
              status: 409, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
      }
    }

    // Get field info including net prices
    const { data: field } = await supabaseClient
      .from('fields')
      .select('name, net_price_1h, net_price_1h30, net_price_2h')
      .eq('id', existingBooking.field_id)
      .maybeSingle();

    if (!field) {
      console.error(`[${timestamp}] [create-paydunya-invoice] Field not found:`, existingBooking.field_id);
      throw new Error('Terrain introuvable');
    }

    if (!field.net_price_1h) {
      console.error(`[${timestamp}] [create-paydunya-invoice] Missing net prices for field:`, field.name);
      throw new Error('Prix net propriétaire non configuré pour ce terrain');
    }

    // Le montant reçu est déjà le finalTotal (prix public + frais opérateurs 3%)
    const amountCheckout = amount;
    
    // Extraire le prix public (subtotal) et les frais opérateurs
    // finalTotal = publicPrice + (publicPrice * 0.03)
    // donc publicPrice = finalTotal / 1.03
    const publicPrice = Math.round(amountCheckout / 1.03);
    const operatorFee = amountCheckout - publicPrice;
    
    // ========== MODIFICATION 2: LOGIQUE HYBRIDE : PROMO vs SANS PROMO ==========
    let netPriceOwner: number;
    let ownerAmount: number;
    let platformFeeOwner: number;

    // Détecte si une promo est appliquée sur cette réservation
    const hasPromo = !!existingBooking.promo_code_id;

    if (hasPromo) {
      // ✅ AVEC PROMO : Utiliser les valeurs déjà calculées dans la booking
      // Ces valeurs ont été calculées côté frontend avec la logique owner-funded
      console.log(`[${timestamp}] [create-paydunya-invoice] 🎉 Promo détectée - Utilisation des valeurs pré-calculées`);

      ownerAmount = existingBooking.owner_amount || 0;
      platformFeeOwner = existingBooking.platform_fee_owner || 0;
      netPriceOwner = existingBooking.field_price || ownerAmount;

      // Validation de cohérence : vérifier que les valeurs sont cohérentes
      const expectedTotal = ownerAmount + platformFeeOwner;
      const tolerance = 10; // Tolérance d'arrondi de 10 XOF

      if (Math.abs(publicPrice - expectedTotal) > tolerance) {
        console.warn(`[${timestamp}] [create-paydunya-invoice] ⚠️ Incohérence détectée:`, {
          public_price: publicPrice,
          owner_amount: ownerAmount,
          platform_fee_owner: platformFeeOwner,
          expected_total: expectedTotal,
          difference: publicPrice - expectedTotal
        });
      }

      console.log(`[${timestamp}] [create-paydunya-invoice] Promo amounts:`, {
        promo_id: existingBooking.promo_code_id,
        owner_amount: ownerAmount,
        platform_fee_owner: platformFeeOwner,
        net_price_owner: netPriceOwner,
        public_price: publicPrice
      });

    } else {
      // ✅ SANS PROMO : Recalculer depuis la DB (logique initiale)
      // Cette logique est conservée pour compatibilité avec les réservations existantes
      console.log(`[${timestamp}] [create-paydunya-invoice] Pas de promo - Recalcul depuis la DB`);

      // Calculer la durée de réservation en minutes
      const startTime = new Date(`1970-01-01T${existingBooking.start_time}`);
      const endTime = new Date(`1970-01-01T${existingBooking.end_time}`);
      const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      const durationHours = durationMinutes / 60;

      // Déterminer le prix NET original selon la durée configurée par le propriétaire
      if (durationMinutes === 60) {
        // Réservation de 1 heure
        netPriceOwner = field.net_price_1h;
      } else if (durationMinutes === 90) {
        // Réservation de 1h30
        netPriceOwner = field.net_price_1h30 || field.net_price_1h;
      } else if (durationMinutes === 120) {
        // Réservation de 2 heures
        netPriceOwner = field.net_price_2h || field.net_price_1h;
      } else {
        // Fallback : durées personnalisées (proportionnel au prix 1h)
        netPriceOwner = Math.floor(field.net_price_1h * durationHours);
      }

      if (!netPriceOwner || netPriceOwner <= 0) {
        console.error(`[${timestamp}] [create-paydunya-invoice] Invalid net price:`, {
          duration_minutes: durationMinutes,
          field_name: field.name,
          net_price_1h: field.net_price_1h
        });
        throw new Error('Prix net propriétaire invalide pour cette durée');
      }

      console.log(`[${timestamp}] [create-paydunya-invoice] Duration & Net Price:`, {
        duration_minutes: durationMinutes,
        duration_hours: durationHours,
        net_price_owner: netPriceOwner,
        field_name: field.name
      });

      // Le propriétaire touche EXACTEMENT ce qu'il a configuré (arrondi plancher)
      ownerAmount = Math.floor(netPriceOwner);

      // La plateforme garde TOUTE la différence (pas de calcul de %)
      // Avec l'arrondi commercial, cette différence peut être > 3%
      platformFeeOwner = publicPrice - ownerAmount;
    }

    // Validation : la plateforme ne doit jamais perdre d'argent
    if (platformFeeOwner < 0) {
      console.error(`[${timestamp}] [create-paydunya-invoice] Negative platform fee:`, {
        public_price: publicPrice,
        owner_amount: ownerAmount,
        platform_fee_owner: platformFeeOwner,
        has_promo: hasPromo
      });
      throw new Error(
        `Erreur de calcul: Le prix public (${publicPrice} XOF) est inférieur au prix net propriétaire (${ownerAmount} XOF). ` +
        `Cela peut être dû à une promotion trop importante ou une configuration de prix incorrecte.`
      );
    }

    console.log(`[${timestamp}] [create-paydunya-invoice] Fee calculation (CORRECTED):`, {
      // Ce que le client paie
      amount_checkout: amountCheckout,
      
      // Prix public du terrain (avant frais opérateurs)
      public_price: publicPrice,
      
      // Frais opérateurs PayDunya (3%)
      operator_fee: operatorFee,
      operator_fee_pct: ((operatorFee / publicPrice) * 100).toFixed(2) + '%',
      
      // Prix NET original configuré par le propriétaire
      net_price_owner_original: netPriceOwner,
      
      // Montant reversé au propriétaire (= prix NET)
      owner_amount: ownerAmount,
      
      // Commission plateforme (TOUTE la différence)
      platform_fee_owner: platformFeeOwner,
      platform_commission_effective: ((platformFeeOwner / publicPrice) * 100).toFixed(2) + '%',
      
      // Has promo
      has_promo: hasPromo,
      
      // Vérifications
      total_check: publicPrice === (ownerAmount + platformFeeOwner),
      platform_gain_ok: platformFeeOwner >= 0
    });

    // ========== VALIDATION DU PRIX PLANCHER ==========
    // Le prix public doit couvrir au minimum : net propriétaire + frais opérateurs
    // Sinon, les promotions/coupons font perdre de l'argent à la plateforme
    const minimumPublicPrice = ownerAmount + operatorFee;

    if (publicPrice < ownerAmount) {
      console.error(`[${timestamp}] [create-paydunya-invoice] Public price below owner net price:`, {
        public_price: publicPrice,
        owner_amount: ownerAmount,
        difference: publicPrice - ownerAmount
      });
      
      throw new Error(
        `Prix plancher atteint. Le prix public (${publicPrice} XOF) ne peut pas être inférieur ` +
        `au prix net propriétaire (${ownerAmount} XOF). ` +
        `Veuillez réduire la promotion ou le coupon appliqué.`
      );
    }

    // Warning si la commission plateforme devient trop faible (< 100 XOF)
    if (platformFeeOwner < 100 && platformFeeOwner > 0) {
      console.warn(`[${timestamp}] [create-paydunya-invoice] ⚠️ Low platform commission:`, {
        platform_fee_owner: platformFeeOwner,
        public_price: publicPrice,
        owner_amount: ownerAmount,
        warning: 'Commission plateforme très faible, vérifier les promotions appliquées'
      });
    }

    // ========== MODIFICATION 3: Update conditionnel de la booking ==========
    // Si une promo est appliquée, on ne met à jour QUE le statut
    // Les montants ont déjà été calculés correctement côté frontend
    const bookingUpdate = hasPromo ? {
      // Avec promo : Ne mettre à jour QUE le statut de paiement
      // Les valeurs field_price, platform_fee_owner, owner_amount sont déjà correctes
      payment_status: 'pending',
      payout_sent: false
    } : {
      // Sans promo : Mettre à jour tous les montants (logique initiale)
      field_price: publicPrice,
      platform_fee_user: operatorFee,
      platform_fee_owner: platformFeeOwner,
      owner_amount: ownerAmount,
      total_price: amountCheckout,
      payment_status: 'pending',
      payout_sent: false
    };

    console.log(`[${timestamp}] [create-paydunya-invoice] Booking update strategy:`, {
      has_promo: hasPromo,
      will_update_amounts: !hasPromo,
      update_fields: Object.keys(bookingUpdate)
    });

    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .update(bookingUpdate)
      .eq('id', booking_id)
      .select()
      .single();

    if (bookingError || !booking) {
      console.error(`[${timestamp}] [create-paydunya-invoice] Booking update failed:`, bookingError);
      throw new Error('Mise à jour réservation échouée');
    }

    // PayDunya Invoice creation
    const invoiceToken = `invoice_${booking.id}_${Date.now()}`;
    
    // Update booking with PayDunya info FIRST - before creating invoice
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        payment_intent_id: invoiceToken,
        payment_provider: 'paydunya',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking.id);

    if (updateError) {
      console.error(`[${timestamp}] Failed to update booking with payment_intent_id:`, updateError);
      throw new Error('Failed to link payment to booking');
    }

    console.log(`[${timestamp}] Payment intent linked successfully: ${invoiceToken}`);
    
    // Helper pour déterminer l'URL de base
    const getAppBaseUrl = (): string => {
      const env = Deno.env.get('APP_BASE_URL');
      if (env?.startsWith('http')) return env;
      
      const origin = req.headers.get('origin');
      if (origin) return origin;
      
      const host = req.headers.get('host');
      if (host) return host.startsWith('http') ? host : `https://${host}`;
      
      return 'https://pisport.app';
    };
    
    const baseUrl = getAppBaseUrl();
    const returnUrl = return_url || `${baseUrl}/mes-reservations`;
    const cancelUrl = cancel_url || `${baseUrl}/mes-reservations`;
    const callbackUrl = `${supabaseUrl}/functions/v1/paydunya-ipn`;
    const frontendBaseUrl = baseUrl;

    // PayDunya Invoice API call - Utiliser l'API de production
    const paydunyaApiUrl = paydunyaMode === 'test' ? 
      'https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create' : 
      'https://app.paydunya.com/api/v1/checkout-invoice/create';

    const paydunyaData = {
      invoice: {
        total_amount: amountCheckout,
        description: `Réservation ${field?.name || field_name} - ${date} ${time}`,
      },
      store: {
        name: "PISport",
        tagline: "Réservez vos terrains de sport en ligne",
        postal_address: "Abidjan, Côte d'Ivoire",
        phone_number: "+225 0707070707",
        website_url: frontendBaseUrl,
        logo_url: `${frontendBaseUrl}/pisport-logo.png`
      },
      actions: {
        cancel_url: cancelUrl,
        return_url: returnUrl,
        callback_url: callbackUrl
      },
      custom_data: {
        booking_id: booking.id,
        user_id: currentUserId,
        invoice_token: invoiceToken
      }
    };

    console.log(`[${timestamp}] [create-paydunya-invoice] WEBHOOK URL:`, callbackUrl);
    console.log(`[${timestamp}] [create-paydunya-invoice] PayDunya API URL:`, paydunyaApiUrl);
    console.log(`[${timestamp}] [create-paydunya-invoice] PayDunya request:`, paydunyaData);

    console.log(`[${timestamp}] [create-paydunya-invoice] Sending request headers:`, {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': paydunyaMasterKey ? `${paydunyaMasterKey.substring(0, 8)}...` : 'Missing',
      'PAYDUNYA-PRIVATE-KEY': paydunyaPrivateKey ? `${paydunyaPrivateKey.substring(0, 8)}...` : 'Missing',
      'PAYDUNYA-TOKEN': paydunyaToken ? `${paydunyaToken.substring(0, 8)}...` : 'Missing',
      'PAYDUNYA-MODE': paydunyaMode
    });

    const paydunyaResponse = await fetch(paydunyaApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': paydunyaMasterKey,
        'PAYDUNYA-PRIVATE-KEY': paydunyaPrivateKey,
        'PAYDUNYA-TOKEN': paydunyaToken,
        'PAYDUNYA-MODE': paydunyaMode
      },
      body: JSON.stringify(paydunyaData)
    });

    const paydunyaResult = await paydunyaResponse.json();
    console.log(`[${timestamp}] [create-paydunya-invoice] PayDunya response status:`, paydunyaResponse.status);
    console.log(`[${timestamp}] [create-paydunya-invoice] PayDunya response headers:`, Object.fromEntries(paydunyaResponse.headers.entries()));
    console.log(`[${timestamp}] [create-paydunya-invoice] PayDunya response:`, paydunyaResult);

    if (paydunyaResult.response_code !== '00') {
      console.error(`[${timestamp}] PayDunya API Error:`, {
        code: paydunyaResult.response_code,
        text: paydunyaResult.response_text,
        details: paydunyaResult
      });
      throw new Error(`PayDunya error: ${paydunyaResult.response_text || 'Erreur inconnue'}`);
    }

    // Récupérer le vrai token PayDunya et synchroniser la réservation
    // PayDunya renvoie le token directement, pas dans invoice.token
    const paydunyaInvoiceToken = 
      paydunyaResult?.token ||              // Format standard PayDunya
      paydunyaResult?.invoice?.token ||     // Fallback au cas où
      paydunyaResult?.response_text?.match(/\/([^\/]+)$/)?.[1]; // Extraire du URL

    console.log(`[${timestamp}] 🔍 Token extraction:`, {
      direct: paydunyaResult?.token,
      nested: paydunyaResult?.invoice?.token,
      url: paydunyaResult?.response_text,
      extracted: paydunyaInvoiceToken
    });
    
    if (paydunyaInvoiceToken) {
      console.log(`[${timestamp}] Synchronisation token PayDunya: ${paydunyaInvoiceToken}`);
      
      const { error: tokenUpdateError } = await supabaseClient
        .from('bookings')
        .update({
          payment_intent_id: paydunyaInvoiceToken,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);
      
      if (tokenUpdateError) {
        console.error(`[${timestamp}] Erreur synchronisation token PayDunya:`, tokenUpdateError);
      } else {
        console.log(`[${timestamp}] ✅ Token PayDunya synchronisé avec succès`);
      }
    }

    // Construct successful response data
    const responseData: PaymentResponse = {
      url: paydunyaResult.response_text,
      invoice_token: paydunyaInvoiceToken || invoiceToken,
      amount_checkout: amountCheckout,
      field_price: publicPrice,
      platform_fee_user: operatorFee,
      platform_fee_owner: platformFeeOwner,
      owner_amount: ownerAmount,
      currency: 'XOF'
    };

    console.log(`[${timestamp}] [create-paydunya-invoice] Success:`, responseData);

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error(`[${timestamp}] [create-paydunya-invoice] Error:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        timestamp,
        function: 'create-paydunya-invoice'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
