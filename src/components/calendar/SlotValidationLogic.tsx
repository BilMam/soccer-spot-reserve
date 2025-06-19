
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

export class SlotValidationLogic {
  private availableSlots: AvailabilitySlot[];
  private bookedSlots: string[];

  constructor(availableSlots: AvailabilitySlot[], bookedSlots: string[]) {
    this.availableSlots = availableSlots;
    this.bookedSlots = bookedSlots;
  }

  // RENFORCÉ: Vérifier si une plage horaire est entièrement disponible avec validation stricte
  isRangeAvailable(startTime: string, endTime: string): boolean {
    if (!startTime || !endTime) return false;
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    console.log('🔍🔒 isRangeAvailable STRICT - Vérification plage:', `${startTime}-${endTime}`);

    // Vérifier chaque créneau de 30 minutes dans la plage
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const slotStartTime = minutesToTime(minutes);
      const slotEndTime = minutesToTime(minutes + 30);
      
      // Normaliser les temps pour la comparaison
      const normalizedSlotStart = normalizeTime(slotStartTime);
      const normalizedSlotEnd = normalizeTime(slotEndTime);
      
      // 1. Vérifier que le créneau existe dans les créneaux disponibles
      const slot = this.availableSlots.find(s => {
        const normalizedDbStart = normalizeTime(s.start_time);
        const normalizedDbEnd = normalizeTime(s.end_time);
        return normalizedDbStart === normalizedSlotStart && normalizedDbEnd === normalizedSlotEnd;
      });
      
      if (!slot) {
        console.log('🔍🔒 Créneau inexistant:', `${normalizedSlotStart}-${normalizedSlotEnd}`);
        return false;
      }

      // 2. Vérifier que le créneau est marqué comme disponible
      if (!slot.is_available) {
        console.log('🔍🔒 Créneau indisponible:', `${normalizedSlotStart}-${normalizedSlotEnd}`);
        return false;
      }
      
      // 3. CRITIQUE: Vérifier qu'il n'est pas réservé
      const slotKey = `${normalizedSlotStart}-${normalizedSlotEnd}`;
      if (this.bookedSlots.includes(slotKey)) {
        console.log('🔍🔒 Créneau RÉSERVÉ détecté:', slotKey);
        return false;
      }

      console.log('🔍🔒 Créneau OK:', `${normalizedSlotStart}-${normalizedSlotEnd}`);
    }
    
    console.log('🔍🔒 Plage ENTIÈREMENT disponible:', `${startTime}-${endTime}`);
    return true;
  }
}
