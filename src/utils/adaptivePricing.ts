/**
 * Système de tarification adaptative
 * Calcule le prix d'une réservation basé sur la durée et les prix définis par le propriétaire
 */

interface PricingData {
  price_per_hour: number;    // Prix pour 1h
  price_1h30?: number | null; // Prix pour 1h30
  price_2h?: number | null;   // Prix pour 2h
}

/**
 * Calcule le prix total basé sur la durée en minutes
 * @param durationMinutes Durée de la réservation en minutes
 * @param pricingData Prix définis par le propriétaire
 * @returns Prix total en XOF
 */
export function calculateAdaptivePrice(
  durationMinutes: number,
  pricingData: PricingData
): number {
  const { price_per_hour, price_1h30, price_2h } = pricingData;

  // Prix fixes pour les durées standard
  switch (durationMinutes) {
    case 60: // 1h
      return price_per_hour;
    
    case 90: // 1h30
      return price_1h30 || (price_per_hour * 1.5);
    
    case 120: // 2h
      return price_2h || (price_per_hour * 2);
    
    default:
      // Pour toutes les autres durées, calcul proportionnel basé sur le tarif horaire
      const hours = durationMinutes / 60;
      return Math.round(price_per_hour * hours);
  }
}

/**
 * Calcule le prix avec les frais de service
 * @param durationMinutes Durée de la réservation en minutes
 * @param pricingData Prix définis par le propriétaire
 * @param serviceFeeRate Taux de frais de service (par défaut 3%)
 * @returns Objet avec le détail des prix
 */
export function calculatePriceWithFees(
  durationMinutes: number,
  pricingData: PricingData,
  serviceFeeRate: number = 0.03
): {
  subtotal: number;
  serviceFee: number;
  total: number;
  durationMinutes: number;
  durationHoursFloat: number;
} {
  const durationHoursFloat = durationMinutes / 60;
  const subtotal = calculateAdaptivePrice(durationMinutes, pricingData);
  const serviceFee = Math.ceil(subtotal * serviceFeeRate); // Arrondi à l'XOF supérieur
  const total = subtotal + serviceFee;

  return {
    subtotal,
    serviceFee,
    total,
    durationMinutes,
    durationHoursFloat
  };
}

/**
 * Formate l'affichage du prix avec la durée
 * @param durationMinutes Durée en minutes
 * @param price Prix
 * @returns Chaîne formatée
 */
export function formatPriceDisplay(durationMinutes: number, price: number): string {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  
  let durationText = '';
  if (hours > 0) {
    durationText = `${hours}h`;
    if (minutes > 0) {
      durationText += `${minutes}min`;
    }
  } else {
    durationText = `${minutes}min`;
  }
  
  return `${price.toLocaleString()} XOF (${durationText})`;
}
