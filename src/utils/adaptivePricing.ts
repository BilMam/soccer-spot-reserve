/**
 * Système de tarification adaptative avec commission 3%
 * Calcule le prix PUBLIC affiché au client basé sur la durée
 */

import { calculatePublicPrice } from './publicPricing';

interface PricingData {
  // Nouveaux champs (prioritaires)
  net_price_1h?: number;
  net_price_1h30?: number | null;
  net_price_2h?: number | null;
  public_price_1h?: number;
  public_price_1h30?: number | null;
  public_price_2h?: number | null;
  
  // Anciens champs (fallback pour compatibilité)
  price_per_hour?: number;
  price_1h30?: number | null;
  price_2h?: number | null;
}

/**
 * Calcule le prix PUBLIC basé sur la durée en minutes
 * IMPORTANT: Retourne toujours le prix PUBLIC (ce que le client paie)
 * @param durationMinutes Durée de la réservation en minutes
 * @param pricingData Prix définis par le propriétaire
 * @returns Prix PUBLIC total en XOF
 */
export function calculateAdaptivePrice(
  durationMinutes: number,
  pricingData: PricingData
): number {
  // PRIORITÉ: Utiliser les prix publics si disponibles
  switch (durationMinutes) {
    case 60: // 1h
      if (pricingData.public_price_1h) return pricingData.public_price_1h;
      if (pricingData.net_price_1h) return calculatePublicPrice(pricingData.net_price_1h);
      return pricingData.price_per_hour ? calculatePublicPrice(pricingData.price_per_hour) : 0;
    
    case 90: // 1h30
      if (pricingData.public_price_1h30) return pricingData.public_price_1h30;
      if (pricingData.net_price_1h30) return calculatePublicPrice(pricingData.net_price_1h30);
      // Fallback: calculer à partir du net 1h ou ancien prix
      if (pricingData.net_price_1h) return calculatePublicPrice(pricingData.net_price_1h * 1.5);
      return pricingData.price_1h30 ? calculatePublicPrice(pricingData.price_1h30) :
        pricingData.price_per_hour ? calculatePublicPrice(pricingData.price_per_hour * 1.5) : 0;
    
    case 120: // 2h
      if (pricingData.public_price_2h) return pricingData.public_price_2h;
      if (pricingData.net_price_2h) return calculatePublicPrice(pricingData.net_price_2h);
      // Fallback: calculer à partir du net 1h ou ancien prix
      if (pricingData.net_price_1h) return calculatePublicPrice(pricingData.net_price_1h * 2);
      return pricingData.price_2h ? calculatePublicPrice(pricingData.price_2h) :
        pricingData.price_per_hour ? calculatePublicPrice(pricingData.price_per_hour * 2) : 0;
    
    default:
      // Pour les autres durées, calcul proportionnel
      const hours = durationMinutes / 60;
      if (pricingData.net_price_1h) {
        const netPrice = pricingData.net_price_1h * hours;
        return calculatePublicPrice(netPrice);
      }
      return pricingData.price_per_hour ? calculatePublicPrice(pricingData.price_per_hour * hours) : 0;
  }
}

/**
 * DÉPRÉCIÉ: Cette fonction n'est plus nécessaire avec le nouveau modèle
 * Les frais de service (3%) sont déjà inclus dans le prix public
 * Utilisez calculateAdaptivePrice() directement
 */

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
