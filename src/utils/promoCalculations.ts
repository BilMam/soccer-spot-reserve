/**
 * Utilitaires de calcul pour les promotions
 * 
 * Règles:
 * - La réduction impacte le montant net propriétaire (owner-funded)
 * - Le prix public est recalculé depuis le nouveau net
 * - Les frais opérateurs s'ajoutent ensuite au checkout (non modifiés ici)
 */

import { calculatePublicPrice, calculatePlatformCommission } from './publicPricing';

export interface PromoImpactResult {
  // AVANT promo
  ownerNetBefore: number;
  publicPriceBefore: number;
  commissionBefore: number;
  
  // APRÈS promo
  ownerNetAfter: number;
  publicPriceAfter: number;
  commissionAfter: number;
  
  // DELTAS
  ownerLoss: number;        // Ce que le proprio perd
  customerSavings: number;  // Ce que le client économise
  platformDelta: number;    // Variation commission plateforme
}

/**
 * Applique une réduction sur un montant (avec garde-fous)
 * @param amount - Montant de base
 * @param discountType - 'percent' ou 'fixed'
 * @param discountValue - Valeur de la réduction
 * @returns Montant après réduction (minimum 0, arrondi XOF)
 */
export function applyDiscount(
  amount: number, 
  discountType: 'percent' | 'fixed', 
  discountValue: number
): number {
  if (!amount || amount <= 0) return 0;
  if (!discountValue || discountValue <= 0) return amount;
  
  let result: number;
  
  if (discountType === 'percent') {
    // Limiter le pourcentage à 100%
    const safePercent = Math.min(discountValue, 100);
    const discount = Math.round(amount * (safePercent / 100));
    result = amount - discount;
  } else {
    result = amount - discountValue;
  }
  
  // Garantir un minimum de 0 et arrondir
  return Math.max(0, Math.round(result));
}

/**
 * Calcule l'impact complet d'une promo (modèle owner-funded)
 * 
 * La réduction est appliquée sur le net propriétaire, puis le prix public
 * est recalculé avec la même formule de commission.
 * 
 * @param ownerNetBefore - Net propriétaire avant promo
 * @param discountType - 'percent' ou 'fixed'
 * @param discountValue - Valeur de la réduction
 * @returns Impact détaillé avant/après avec deltas
 */
export function calculatePromoImpact(
  ownerNetBefore: number,
  discountType: 'percent' | 'fixed',
  discountValue: number
): PromoImpactResult {
  // Prix public AVANT (depuis le net actuel)
  const publicPriceBefore = calculatePublicPrice(ownerNetBefore);
  const commissionBefore = calculatePlatformCommission(publicPriceBefore, ownerNetBefore);

  // Net propriétaire APRÈS (la réduction impacte le net)
  const ownerNetAfter = applyDiscount(ownerNetBefore, discountType, discountValue);
  
  // Prix public APRÈS (recalculé depuis le nouveau net)
  const publicPriceAfter = calculatePublicPrice(ownerNetAfter);
  const commissionAfter = calculatePlatformCommission(publicPriceAfter, ownerNetAfter);

  return {
    ownerNetBefore,
    publicPriceBefore,
    commissionBefore,
    ownerNetAfter,
    publicPriceAfter,
    commissionAfter,
    ownerLoss: ownerNetBefore - ownerNetAfter,
    customerSavings: publicPriceBefore - publicPriceAfter,
    platformDelta: commissionBefore - commissionAfter
  };
}

/**
 * Récupère le prix net pour une durée donnée depuis les données du terrain
 */
export function getNetPriceForDuration(
  field: {
    net_price_1h?: number | null;
    net_price_1h30?: number | null;
    net_price_2h?: number | null;
    price_per_hour?: number;
  },
  duration: '1h' | '1h30' | '2h'
): number {
  switch (duration) {
    case '1h':
      return field.net_price_1h ?? field.price_per_hour ?? 0;
    case '1h30':
      return field.net_price_1h30 ?? (field.net_price_1h ? field.net_price_1h * 1.5 : 0);
    case '2h':
      return field.net_price_2h ?? (field.net_price_1h ? field.net_price_1h * 2 : 0);
    default:
      return field.net_price_1h ?? field.price_per_hour ?? 0;
  }
}
