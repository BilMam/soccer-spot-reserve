import { useMemo } from 'react';
import { ActivePromo } from './useActivePromosForField';
import { applyDiscount } from '@/utils/promoCalculations';

interface PromoSlotResult {
  isEligible: boolean;
  promo: ActivePromo | null;
  originalPrice: number;
  discountedPrice: number;
  savings: number;
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
 * et calculer le prix réduit
 */
export function usePromoForSlot(
  promos: ActivePromo[] | undefined,
  date: Date | null,
  startTime: string,
  originalPrice: number
): PromoSlotResult {
  return useMemo(() => {
    const defaultResult: PromoSlotResult = {
      isEligible: false,
      promo: null,
      originalPrice,
      discountedPrice: originalPrice,
      savings: 0,
      discountLabel: ''
    };

    if (!promos || promos.length === 0 || !date || !startTime || originalPrice <= 0) {
      return defaultResult;
    }

    // Trouver la meilleure promo applicable
    let bestPromo: ActivePromo | null = null;
    let bestSavings = 0;

    for (const promo of promos) {
      // Vérifier le montant minimum
      if (promo.minBookingAmount > 0 && originalPrice < promo.minBookingAmount) {
        continue;
      }

      // Vérifier l'éligibilité du créneau
      if (!isSlotEligibleForPromo(promo, date, startTime)) {
        continue;
      }

      // Calculer les économies
      const discountedPrice = applyDiscount(originalPrice, promo.discountType, promo.discountValue);
      const savings = originalPrice - discountedPrice;

      if (savings > bestSavings) {
        bestSavings = savings;
        bestPromo = promo;
      }
    }

    if (!bestPromo) {
      return defaultResult;
    }

    const discountedPrice = applyDiscount(originalPrice, bestPromo.discountType, bestPromo.discountValue);
    const savings = originalPrice - discountedPrice;

    const discountLabel = bestPromo.discountType === 'percent' 
      ? `-${bestPromo.discountValue}%` 
      : `-${bestPromo.discountValue.toLocaleString()} F`;

    return {
      isEligible: true,
      promo: bestPromo,
      originalPrice,
      discountedPrice,
      savings,
      discountLabel
    };
  }, [promos, date, startTime, originalPrice]);
}

/**
 * Fonction utilitaire pour vérifier si un créneau est en promo (sans hook)
 */
export function checkSlotPromoEligibility(
  promos: ActivePromo[],
  date: Date,
  startTime: string,
  originalPrice: number
): PromoSlotResult {
  const defaultResult: PromoSlotResult = {
    isEligible: false,
    promo: null,
    originalPrice,
    discountedPrice: originalPrice,
    savings: 0,
    discountLabel: ''
  };

  if (!promos || promos.length === 0 || originalPrice <= 0) {
    return defaultResult;
  }

  let bestPromo: ActivePromo | null = null;
  let bestSavings = 0;

  for (const promo of promos) {
    if (promo.minBookingAmount > 0 && originalPrice < promo.minBookingAmount) {
      continue;
    }

    if (!isSlotEligibleForPromo(promo, date, startTime)) {
      continue;
    }

    const discountedPrice = applyDiscount(originalPrice, promo.discountType, promo.discountValue);
    const savings = originalPrice - discountedPrice;

    if (savings > bestSavings) {
      bestSavings = savings;
      bestPromo = promo;
    }
  }

  if (!bestPromo) {
    return defaultResult;
  }

  const discountedPrice = applyDiscount(originalPrice, bestPromo.discountType, bestPromo.discountValue);
  const savings = originalPrice - discountedPrice;

  const discountLabel = bestPromo.discountType === 'percent' 
    ? `-${bestPromo.discountValue}%` 
    : `-${bestPromo.discountValue.toLocaleString()} F`;

  return {
    isEligible: true,
    promo: bestPromo,
    originalPrice,
    discountedPrice,
    savings,
    discountLabel
  };
}
