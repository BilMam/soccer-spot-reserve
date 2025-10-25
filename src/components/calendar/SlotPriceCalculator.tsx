
import { timeToMinutes, minutesToTime, normalizeTime } from '@/utils/timeUtils';
import { calculateAdaptivePrice } from '@/utils/adaptivePricing';

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  price_override?: number;
  unavailability_reason?: string;
  is_maintenance?: boolean;
  notes?: string;
}

interface PricingData {
  // Nouveaux champs (prioritaires)
  net_price_1h?: number;
  net_price_1h30?: number | null;
  net_price_2h?: number | null;
  public_price_1h?: number;
  public_price_1h30?: number | null;
  public_price_2h?: number | null;
  
  // Anciens champs (fallback)
  price_per_hour?: number;
  price_1h30?: number | null;
  price_2h?: number | null;
}

export class SlotPriceCalculator {
  private availableSlots: AvailabilitySlot[];
  private fieldPricing: PricingData;

  constructor(availableSlots: AvailabilitySlot[], pricingData: PricingData) {
    this.availableSlots = availableSlots;
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
