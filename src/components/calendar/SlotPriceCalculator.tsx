
import { timeToMinutes, minutesToTime, normalizeTime } from '@/utils/timeUtils';
import { calculateAdaptivePrice, calculatePriceWithFees } from '@/utils/adaptivePricing';

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
  price_per_hour: number;
  price_1h30?: number | null;
  price_2h?: number | null;
}

export class SlotPriceCalculator {
  private availableSlots: AvailabilitySlot[];
  private fieldPricing: PricingData;

  constructor(availableSlots: AvailabilitySlot[], fieldPrice: number, price1h30?: number | null, price2h?: number | null) {
    this.availableSlots = availableSlots;
    this.fieldPricing = {
      price_per_hour: fieldPrice,
      price_1h30: price1h30,
      price_2h: price2h
    };
  }

  // Calculer le prix total pour une plage horaire avec le système adaptatif
  calculateTotalPrice(startTime: string, endTime: string): number {
    if (!startTime || !endTime) return 0;
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const durationMinutes = endMinutes - startMinutes;
    
    console.log('🔍 calculateTotalPrice - Calcul pour:', `${startTime}-${endTime}`, `(${durationMinutes} min)`);
    
    // Utiliser le système de tarification adaptative
    const totalPrice = calculateAdaptivePrice(durationMinutes, this.fieldPricing);
    
    console.log('🔍 Prix total calculé (adaptatif):', totalPrice);
    return totalPrice;
  }

  // Calculer le prix total avec frais de service
  calculateTotalPriceWithFees(startTime: string, endTime: string, serviceFeeRate: number = 0.03): {
    subtotal: number;
    serviceFee: number;
    total: number;
    durationMinutes: number;
    durationHoursFloat: number;
  } {
    if (!startTime || !endTime) {
      return { subtotal: 0, serviceFee: 0, total: 0, durationMinutes: 0, durationHoursFloat: 0 };
    }

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const durationMinutes = endMinutes - startMinutes;
    
    // Utiliser le système de tarification adaptative
    const result = calculatePriceWithFees(durationMinutes, this.fieldPricing, serviceFeeRate);

    console.log('🔍 Calcul détaillé (adaptatif):', result);

    return result;
  }
}
