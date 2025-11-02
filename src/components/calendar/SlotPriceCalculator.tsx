
import { timeToMinutes } from '@/utils/timeUtils';
import { calculateAdaptivePrice } from '@/utils/adaptivePricing';
import type { FieldPricing } from '@/types/pricing';

export class SlotPriceCalculator {
  private fieldPricing: FieldPricing;

  constructor(pricingData: FieldPricing) {
    this.fieldPricing = pricingData;
  }

  // Calculer le prix PUBLIC total pour une plage horaire
  calculateTotalPrice(startTime: string, endTime: string): number {
    if (!startTime || !endTime) return 0;
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const durationMinutes = endMinutes - startMinutes;
    
    console.log('🔍 calculateTotalPrice - Calcul pour:', `${startTime}-${endTime}`, `(${durationMinutes} min)`);
    
    // Retourne directement le prix PUBLIC (incluant commission 3%)
    const totalPrice = calculateAdaptivePrice(durationMinutes, this.fieldPricing);
    
    console.log('🔍 Prix PUBLIC calculé:', totalPrice);
    return totalPrice;
  }
}
