import type { CinetPayConfig, CinetPayPaymentData } from './types.ts';

export function getCinetPayConfig(): CinetPayConfig {
  console.log('🔑 Phase 2 - Vérification clés CinetPay...');
  const cinetpayApiKey = Deno.env.get('CINETPAY_API_KEY');
  const cinetpaySiteId = Deno.env.get('CINETPAY_SITE_ID');
  const checkoutUrl = Deno.env.get('CINETPAY_CHECKOUT_URL') || 'https://api-checkout.cinetpay.com/v2/payment';

  console.log('🔑 Clés CinetPay Phase 2:', {
    apiKey: cinetpayApiKey ? `✅ OK (${cinetpayApiKey.substring(0, 10)}...)` : '❌ MANQUANT',
    siteId: cinetpaySiteId ? `✅ OK (${cinetpaySiteId})` : '❌ MANQUANT',
    siteIdType: typeof cinetpaySiteId,
    siteIdParsed: cinetpaySiteId ? parseInt(cinetpaySiteId) : 'N/A'
  });

  if (!cinetpayApiKey || !cinetpaySiteId) {
    console.error('❌ Clés API CinetPay non configurées');
    throw new Error('Configuration CinetPay manquante');
  }

  return {
    apiKey: cinetpayApiKey,
    siteId: cinetpaySiteId,
    checkoutUrl
  };
}

export function createPaymentData(
  config: CinetPayConfig,
  transactionId: string,
  amount: number,
  fieldName: string,
  date: string,
  time: string,
  user: any,
  returnUrl: string,
  notifyUrl: string,
  bookingId: string
): CinetPayPaymentData {
  return {
    apikey: config.apiKey,
    site_id: config.siteId,
    transaction_id: transactionId,
    amount: amount,
    currency: 'XOF',
    description: `Réservation terrain ${fieldName} - ${date} à ${time}`,
    customer_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Client',
    customer_surname: user.user_metadata?.last_name || '',
    customer_email: user.email,
    customer_phone_number: user.user_metadata?.phone || user.phone || '',
    return_url: returnUrl,
    notify_url: notifyUrl,
    channels: 'ALL',
    metadata: bookingId
  };
}

export async function callCinetPayAPI(config: CinetPayConfig, paymentData: CinetPayPaymentData) {
  console.log('💳 Phase 2 - Appel API CinetPay...');
  console.log('💳 URL CinetPay:', config.checkoutUrl);
  console.log('💳 Données envoyées Phase 2:', {
    ...paymentData,
    apikey: '***MASKED***' // Masquer la clé API dans les logs
  });

  const cinetpayResponse = await fetch(config.checkoutUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentData)
  });

  console.log('📡 Phase 2 - Statut réponse CinetPay:', cinetpayResponse.status);
  console.log('📡 Content-Type:', cinetpayResponse.headers.get('content-type'));
  console.log('📡 Headers réponse Phase 2:', Object.fromEntries(cinetpayResponse.headers.entries()));

  let result: any;
  try {
    result = await cinetpayResponse.json();
    console.log('📡 Phase 2 - Contenu réponse CinetPay:', result);
  } catch (parseError) {
    const rawText = await cinetpayResponse.text();
    console.error('❌ Erreur parsing JSON Phase 2:', parseError);
    console.error('❌ Réponse brute CinetPay (non-JSON):', rawText.slice(0, 500));
    throw new Error(`CinetPay réponse non-JSON (${cinetpayResponse.status}): ${rawText.slice(0, 200)}`);
  }

  if (!cinetpayResponse.ok) {
    console.error('❌ Erreur HTTP CinetPay:', {
      status: cinetpayResponse.status,
      statusText: cinetpayResponse.statusText,
      headers: Object.fromEntries(cinetpayResponse.headers.entries())
    });
    
    throw new Error(`Erreur HTTP CinetPay: ${cinetpayResponse.status} - ${JSON.stringify(result)}`);
  }

  if (result.code !== '201') {
    console.error('❌ Erreur API CinetPay:', {
      code: result.code,
      message: result.message,
      description: result.description,
      data: result.data,
      fullResponse: result
    });
    throw new Error(`Erreur CinetPay API (${result.code}): ${result.message || result.description || 'Code de réponse inattendu'}`);
  }

  console.log('✅ Phase 2 - Paiement CinetPay créé avec succès');
  return result;
}