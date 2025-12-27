import { useMemo } from 'react';
import { ActivePromo } from './useActivePromosForField';
import { calculatePromoImpact } from '@/utils/promoCalculations';
import { calculateNetFromPublic } from '@/utils/publicPricing';

interface PromoSlotResult {
  isEligible: boolean;
  promo: ActivePromo | null;

  // Prix PUBLIC
  publicPriceBefore: number;
  publicPriceAfter: number;
  customerSavings: number; // Ce que le client économise

  // NET PROPRIÉTAIRE
  ownerNetBefore: number;
  ownerNetAfter: number;
  ownerLoss: number; // Ce que le proprio perd

  // COMMISSION PISPORT
  commissionBefore: number;
  commissionAfter: number;

  // UI
  discountLabel: string;
}

/**
 * Vérifie si un créneau est éligible à une promo donnée
 */
function isSlotEligibleForPromo(
  promo: ActivePromo,
  date: Date,
  startTime: string
): boolean {
  // Si pas de créneaux ciblés, la promo s'applique à tous les créneaux
  if (!promo.timeSlots || promo.timeSlots.length === 0) {
    return true;
  }

  const dayOfWeek = date.getDay(); // 0 = dimanche, 1 = lundi, etc.
  const [startHour, startMin] = startTime.split(':').map(Number);
  const slotStartMinutes = startHour * 60 + startMin;

  // Vérifier si le créneau correspond à l'un des créneaux ciblés
  return promo.timeSlots.some(ts => {
    // Vérifier le jour de la semaine (null = tous les jours)
    if (ts.dayOfWeek !== null && ts.dayOfWeek !== dayOfWeek) {
      return false;
    }

    // Vérifier l'heure
    const [tsStartHour, tsStartMin] = ts.startTime.split(':').map(Number);
    const [tsEndHour, tsEndMin] = ts.endTime.split(':').map(Number);
    const tsStartMinutes = tsStartHour * 60 + tsStartMin;
    const tsEndMinutes = tsEndHour * 60 + tsEndMin;

    // Le créneau doit commencer dans la plage horaire de la promo
    return slotStartMinutes >= tsStartMinutes && slotStartMinutes < tsEndMinutes;
  });
}

/**
 * Hook pour vérifier si un créneau spécifique est éligible à une promo
 * et calculer le prix réduit (logique owner-funded)
 */
export function usePromoForSlot(
  promos: ActivePromo[] | undefined,
  date: Date | null,
  startTime: string,
  publicPriceBefore: number
): PromoSlotResult {
  return useMemo(() => {
    // Calculer le net propriétaire depuis le prix public
    const ownerNetBefore = calculateNetFromPublic(publicPriceBefore);

    const defaultResult: PromoSlotResult = {
      isEligible: false,
      promo: null,
      publicPriceBefore,
      publicPriceAfter: publicPriceBefore,
      customerSavings: 0,
      ownerNetBefore,
      ownerNetAfter: ownerNetBefore,
      ownerLoss: 0,
      commissionBefore: publicPriceBefore - ownerNetBefore,
      commissionAfter: publicPriceBefore - ownerNetBefore,
      discountLabel: ''
    };

    if (!promos || promos.length === 0 || !date || !startTime || publicPriceBefore <= 0) {
      return defaultResult;
    }

    // Trouver la meilleure promo applicable
    let bestPromo: ActivePromo | null = null;
    let bestSavings = 0;
    let bestImpact = null;

    for (const promo of promos) {
      // Vérifier le montant minimum (sur prix public)
      if (promo.minBookingAmount > 0 && publicPriceBefore < promo.minBookingAmount) {
        continue;
      }

      // Vérifier l'éligibilité du créneau
      if (!isSlotEligibleForPromo(promo, date, startTime)) {
        continue;
      }

      // ✅ VRAIE LOGIQUE : Calculer l'impact sur le NET propriétaire
      const impact = calculatePromoImpact(ownerNetBefore, promo.discountType, promo.discountValue);

      // Meilleure promo = celle qui fait économiser le plus au client
      if (impact.customerSavings > bestSavings) {
        bestSavings = impact.customerSavings;
        bestPromo = promo;
        bestImpact = impact;
      }
    }

    if (!bestPromo || !bestImpact) {
      return defaultResult;
    }

    const discountLabel = bestPromo.discountType === 'percent'
      ? `-${bestPromo.discountValue}%`
      : `-${bestPromo.discountValue.toLocaleString()} F`;

    return {
      isEligible: true,
      promo: bestPromo,
      publicPriceBefore: bestImpact.publicPriceBefore,
      publicPriceAfter: bestImpact.publicPriceAfter,
      customerSavings: bestImpact.customerSavings,
      ownerNetBefore: bestImpact.ownerNetBefore,
      ownerNetAfter: bestImpact.ownerNetAfter,
      ownerLoss: bestImpact.ownerLoss,
      commissionBefore: bestImpact.commissionBefore,
      commissionAfter: bestImpact.commissionAfter,
      discountLabel
    };
  }, [promos, date, startTime, publicPriceBefore]);
}

/**
 * Fonction utilitaire pour vérifier si un créneau est en promo (sans hook)
 * Utilise la même logique owner-funded
 */
export function checkSlotPromoEligibility(
  promos: ActivePromo[],
  date: Date,
  startTime: string,
  publicPriceBefore: number
): PromoSlotResult {
  const ownerNetBefore = calculateNetFromPublic(publicPriceBefore);

  const defaultResult: PromoSlotResult = {
    isEligible: false,
    promo: null,
    publicPriceBefore,
    publicPriceAfter: publicPriceBefore,
    customerSavings: 0,
    ownerNetBefore,
    ownerNetAfter: ownerNetBefore,
    ownerLoss: 0,
    commissionBefore: publicPriceBefore - ownerNetBefore,
    commissionAfter: publicPriceBefore - ownerNetBefore,
    discountLabel: ''
  };

  if (!promos || promos.length === 0 || publicPriceBefore <= 0) {
    return defaultResult;
  }

  let bestPromo: ActivePromo | null = null;
  let bestSavings = 0;
  let bestImpact = null;

  for (const promo of promos) {
    if (promo.minBookingAmount > 0 && publicPriceBefore < promo.minBookingAmount) {
      continue;
    }

    if (!isSlotEligibleForPromo(promo, date, startTime)) {
      continue;
    }

    const impact = calculatePromoImpact(ownerNetBefore, promo.discountType, promo.discountValue);

    if (impact.customerSavings > bestSavings) {
      bestSavings = impact.customerSavings;
      bestPromo = promo;
      bestImpact = impact;
    }
  }

  if (!bestPromo || !bestImpact) {
    return defaultResult;
  }

  const discountLabel = bestPromo.discountType === 'percent'
    ? `-${bestPromo.discountValue}%`
    : `-${bestPromo.discountValue.toLocaleString()} F`;

  return {
    isEligible: true,
    promo: bestPromo,
    publicPriceBefore: bestImpact.publicPriceBefore,
    publicPriceAfter: bestImpact.publicPriceAfter,
    customerSavings: bestImpact.customerSavings,
    ownerNetBefore: bestImpact.ownerNetBefore,
    ownerNetAfter: bestImpact.ownerNetAfter,
    ownerLoss: bestImpact.ownerLoss,
    commissionBefore: bestImpact.commissionBefore,
    commissionAfter: bestImpact.commissionAfter,
    discountLabel
  };
}
