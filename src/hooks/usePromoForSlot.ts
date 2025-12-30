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
  console.log('🔍 [isSlotEligibleForPromo] Vérification:', {
    promo: promo.name,
    hasTimeSlots: !!promo.timeSlots,
    timeSlotsLength: promo.timeSlots?.length || 0,
    date: date.toISOString(),
    dayOfWeek: date.getDay(),
    startTime
  });

  // Si pas de créneaux ciblés, la promo s'applique à tous les créneaux
  if (!promo.timeSlots || promo.timeSlots.length === 0) {
    console.log('🔍 [isSlotEligibleForPromo] ✅ Tous créneaux éligibles (pas de restriction)');
    return true;
  }

  const dayOfWeek = date.getDay(); // 0 = dimanche, 1 = lundi, etc.
  const [startHour, startMin] = startTime.split(':').map(Number);
  const slotStartMinutes = startHour * 60 + startMin;

  console.log('🔍 [isSlotEligibleForPromo] Créneau à vérifier:', {
    dayOfWeek,
    slotStartMinutes,
    startTime
  });

  // Vérifier si le créneau correspond à l'un des créneaux ciblés
  const isEligible = promo.timeSlots.some(ts => {
    console.log('🔍 [isSlotEligibleForPromo] Test timeSlot:', {
      tsDayOfWeek: ts.dayOfWeek,
      tsStartTime: ts.startTime,
      tsEndTime: ts.endTime
    });

    // Vérifier le jour de la semaine (null = tous les jours)
    if (ts.dayOfWeek !== null && ts.dayOfWeek !== dayOfWeek) {
      console.log('🔍 [isSlotEligibleForPromo] ❌ Jour non correspondant');
      return false;
    }

    // Vérifier l'heure
    const [tsStartHour, tsStartMin] = ts.startTime.split(':').map(Number);
    const [tsEndHour, tsEndMin] = ts.endTime.split(':').map(Number);
    const tsStartMinutes = tsStartHour * 60 + tsStartMin;
    const tsEndMinutes = tsEndHour * 60 + tsEndMin;

    console.log('🔍 [isSlotEligibleForPromo] Comparaison horaire:', {
      slotStartMinutes,
      tsStartMinutes,
      tsEndMinutes,
      inRange: slotStartMinutes >= tsStartMinutes && slotStartMinutes < tsEndMinutes
    });

    // Le créneau doit commencer dans la plage horaire de la promo
    const matches = slotStartMinutes >= tsStartMinutes && slotStartMinutes < tsEndMinutes;
    if (matches) {
      console.log('🔍 [isSlotEligibleForPromo] ✅ TimeSlot correspondant trouvé');
    }
    return matches;
  });

  console.log('🔍 [isSlotEligibleForPromo] Résultat final:', isEligible);
  return isEligible;
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

    console.log('🎁 [usePromoForSlot] Paramètres:', {
      promosCount: promos?.length || 0,
      date: date?.toISOString(),
      dayOfWeek: date?.getDay(),
      startTime,
      publicPriceBefore
    });

    if (!promos || promos.length === 0 || !date || !startTime || publicPriceBefore <= 0) {
      console.log('🎁 [usePromoForSlot] ❌ Aucune promo applicable - conditions initiales non remplies');
      return defaultResult;
    }

    // Trouver la meilleure promo applicable
    let bestPromo: ActivePromo | null = null;
    let bestSavings = 0;
    let bestImpact = null;

    for (const promo of promos) {
      console.log('🎁 [usePromoForSlot] Test promo:', promo.name, {
        minBookingAmount: promo.minBookingAmount,
        publicPriceBefore,
        hasTimeSlots: !!promo.timeSlots,
        timeSlotsCount: promo.timeSlots?.length || 0
      });

      // Vérifier le montant minimum (sur prix public)
      if (promo.minBookingAmount > 0 && publicPriceBefore < promo.minBookingAmount) {
        console.log('🎁 [usePromoForSlot] ❌ Promo rejetée - montant minimum non atteint');
        continue;
      }

      // Vérifier l'éligibilité du créneau
      const isEligible = isSlotEligibleForPromo(promo, date, startTime);
      console.log('🎁 [usePromoForSlot] Éligibilité créneau:', isEligible);

      if (!isEligible) {
        console.log('🎁 [usePromoForSlot] ❌ Promo rejetée - créneau non éligible');
        continue;
      }

      // ✅ VRAIE LOGIQUE : Calculer l'impact sur le NET propriétaire
      const impact = calculatePromoImpact(ownerNetBefore, promo.discountType, promo.discountValue);

      // Meilleure promo = celle qui fait économiser le plus au client
      if (impact.customerSavings > bestSavings) {
        console.log('🎁 [usePromoForSlot] ✅ Promo retenue - économies:', impact.customerSavings, 'XOF');
        bestSavings = impact.customerSavings;
        bestPromo = promo;
        bestImpact = impact;
      }
    }

    console.log('🎁 [usePromoForSlot] Résultat final:', {
      hasBestPromo: !!bestPromo,
      bestPromoName: bestPromo?.name,
      customerSavings: bestSavings
    });

    if (!bestPromo || !bestImpact) {
      console.log('🎁 [usePromoForSlot] ❌ Aucune promo trouvée');
      return defaultResult;
    }

    const discountLabel = bestPromo.discountType === 'percent'
      ? `-${bestPromo.discountValue}%`
      : `-${bestPromo.discountValue.toLocaleString()} F`;

    console.log('🎁 [usePromoForSlot] 🎉 PROMO APPLIQUÉE:', {
      promo: bestPromo.name,
      discountLabel,
      publicBefore: bestImpact.publicPriceBefore,
      publicAfter: bestImpact.publicPriceAfter,
      savings: bestImpact.customerSavings
    });

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

  console.log('🎁 [checkSlotPromoEligibility] Paramètres:', {
    promosCount: promos?.length || 0,
    date: date?.toISOString(),
    dayOfWeek: date?.getDay(),
    startTime,
    publicPriceBefore
  });

  if (!promos || promos.length === 0 || publicPriceBefore <= 0) {
    console.log('🎁 [checkSlotPromoEligibility] ❌ Conditions initiales non remplies');
    return defaultResult;
  }

  let bestPromo: ActivePromo | null = null;
  let bestSavings = 0;
  let bestImpact = null;

  for (const promo of promos) {
    console.log('🎁 [checkSlotPromoEligibility] Test promo:', promo.name);

    if (promo.minBookingAmount > 0 && publicPriceBefore < promo.minBookingAmount) {
      console.log('🎁 [checkSlotPromoEligibility] ❌ Montant minimum non atteint');
      continue;
    }

    if (!isSlotEligibleForPromo(promo, date, startTime)) {
      console.log('🎁 [checkSlotPromoEligibility] ❌ Créneau non éligible');
      continue;
    }

    const impact = calculatePromoImpact(ownerNetBefore, promo.discountType, promo.discountValue);

    if (impact.customerSavings > bestSavings) {
      console.log('🎁 [checkSlotPromoEligibility] ✅ Promo retenue:', impact.customerSavings, 'XOF');
      bestSavings = impact.customerSavings;
      bestPromo = promo;
      bestImpact = impact;
    }
  }

  console.log('🎁 [checkSlotPromoEligibility] Résultat:', {
    hasBestPromo: !!bestPromo,
    bestPromoName: bestPromo?.name,
    customerSavings: bestSavings
  });

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
