
import { timeToMinutes, minutesToTime, normalizeTime } from '@/utils/timeUtils';

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

export class SlotPriceCalculator {
  private availableSlots: AvailabilitySlot[];
  private fieldPrice: number;

  constructor(availableSlots: AvailabilitySlot[], fieldPrice: number) {
    this.availableSlots = availableSlots;
    this.fieldPrice = fieldPrice;
  }

  // Calculer le prix total pour une plage horaire
  calculateTotalPrice(startTime: string, endTime: string): number {
    if (!startTime || !endTime) return 0;
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    let totalPrice = 0;

    console.log('🔍 calculateTotalPrice - Calcul pour:', `${startTime}-${endTime}`);

    // Additionner le prix de chaque créneau de 30 minutes
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const slotStartTime = minutesToTime(minutes);
      const slotEndTime = minutesToTime(minutes + 30);
      
      // Normaliser les temps pour la comparaison
      const normalizedSlotStart = normalizeTime(slotStartTime);
      const normalizedSlotEnd = normalizeTime(slotEndTime);
      
      const slot = this.availableSlots.find(s => {
        const normalizedDbStart = normalizeTime(s.start_time);
        const normalizedDbEnd = normalizeTime(s.end_time);
        return normalizedDbStart === normalizedSlotStart && normalizedDbEnd === normalizedSlotEnd;
      });
      
      const slotPrice = slot?.price_override || this.fieldPrice / 2; // Prix par défaut pour 30 min
      totalPrice += slotPrice;
      
      console.log('🔍 Prix créneau:', `${normalizedSlotStart}-${normalizedSlotEnd}`, 'prix:', slotPrice);
    }
    
    console.log('🔍 Prix total calculé:', totalPrice);
    return totalPrice;
  }
}
