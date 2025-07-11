import type { PaymentRequest } from './types.ts';

export async function parseAndValidateRequest(req: Request): Promise<PaymentRequest> {
  console.log('📥 Phase 2 - Lecture données request...');
  
  // Protection robuste contre le parsing JSON
  let paymentData: PaymentRequest;
  try {
    const rawBody = await req.text();
    console.log('📥 Raw body length:', rawBody.length);
    
    if (!rawBody || rawBody.trim() === '') {
      throw new Error('Body de la requête vide');
    }
    
    paymentData = JSON.parse(rawBody);
    console.log('📥 Données reçues Phase 2:', paymentData);
  } catch (parseError) {
    console.error('❌ Erreur parsing JSON:', parseError);
    throw new Error(`Body JSON invalide: ${parseError.message}`);
  }

  const { booking_id, amount, field_name, date, time } = paymentData;

  // Validation renforcée Phase 2
  console.log('🔍 Phase 2 - Validation renforcée des données...');
  const validationErrors = [];
  
  if (!booking_id) validationErrors.push('booking_id manquant');
  if (!amount || amount <= 0) validationErrors.push(`amount invalide: ${amount}`);
  if (!field_name) validationErrors.push('field_name manquant');
  if (!date) validationErrors.push('date manquante');
  if (!time) validationErrors.push('time manquant');

  // Vérification du montant minimum (100 XOF pour CinetPay)
  if (amount < 100) {
    validationErrors.push(`Montant trop faible: ${amount} XOF (minimum 100 XOF)`);
  }

  if (validationErrors.length > 0) {
    console.error('❌ Erreurs validation Phase 2:', validationErrors);
    throw new Error(`Validation échouée: ${validationErrors.join(', ')}`);
  }

  console.log('✅ Validation Phase 2 réussie');
  return paymentData;
}