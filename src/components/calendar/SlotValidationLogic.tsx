import { timeToMinutes, minutesToTime, normalizeTime } from '@/utils/timeUtils';
import { SlotOverlapUtils } from './SlotOverlapUtils';
import { isSlotInRecurringRange } from '@/utils/recurringSlotChecker';

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  on_hold_until?: string | null;
  hold_cagnotte_id?: string | null;
  price_override?: number;
  unavailability_reason?: string;
  is_maintenance?: boolean;
  notes?: string;
}

export class SlotValidationLogic {
  private availableSlots: AvailabilitySlot[];
  private bookedSlots: string[];
  private overlapUtils: SlotOverlapUtils;
  private recurringSlots: any[];
  private selectedDate: string;

  constructor(
    availableSlots: AvailabilitySlot[], 
    bookedSlots: string[], 
    bookings: Array<{start_time: string, end_time: string}> = [],
    recurringSlots: any[] = [],
    selectedDate: string = ''
  ) {
    this.availableSlots = availableSlots;
    this.bookedSlots = bookedSlots;
    this.overlapUtils = new SlotOverlapUtils(bookings);
    this.recurringSlots = recurringSlots;
    this.selectedDate = selectedDate;
  }

  // RENFORCÉ: Vérifier si une plage horaire est entièrement disponible avec validation stricte ET détection de chevauchements
  isRangeAvailable(startTime: string, endTime: string): boolean {
    if (!startTime || !endTime) return false;
    
    console.log('🔍🔒 isRangeAvailable STRICT - Vérification plage:', `${startTime}-${endTime}`);

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    // PRIORITÉ 1: Vérifier les créneaux récurrents bloqués
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const slotStart = minutesToTime(minutes);
      const slotEnd = minutesToTime(minutes + 30);
      
      const recurringCheck = isSlotInRecurringRange(
        this.recurringSlots,
        this.selectedDate,
        slotStart + ':00',
        slotEnd + ':00'
      );
      
      if (recurringCheck.isRecurring) {
        console.log('🔴 BLOQUÉ PAR CRÉNEAU RÉCURRENT:', recurringCheck.recurringLabel);
        return false;
      }
    }

    // PRIORITÉ 2: Vérifier les chevauchements avec les réservations existantes
    if (this.overlapUtils.isRangeOverlappingWithBookings(startTime, endTime)) {
      console.log('🔍🔒 Plage REJETÉE à cause d\'un chevauchement avec réservations');
      return false;
    }

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

      // 2.5. Vérifier si le créneau est en HOLD actif (cagnotte en cours)
      if (slot.on_hold_until) {
        const holdUntil = new Date(slot.on_hold_until);
        const now = new Date();
        if (holdUntil > now) {
          console.log('🔍🔒 Créneau en HOLD (cagnotte active):', `${normalizedSlotStart}-${normalizedSlotEnd}`, 'expire:', slot.on_hold_until);
          return false;
        }
      }
      
      // 3. Vérifier qu'il n'est pas dans les créneaux réservés (ancien système)
      const slotKey = `${normalizedSlotStart}-${normalizedSlotEnd}`;
      if (this.bookedSlots.includes(slotKey)) {
        console.log('🔍🔒 Créneau RÉSERVÉ détecté (ancien système):', slotKey);
        return false;
      }

      console.log('🔍🔒 Créneau OK:', `${normalizedSlotStart}-${normalizedSlotEnd}`);
    }
    
    console.log('🔍🔒 Plage ENTIÈREMENT disponible:', `${startTime}-${endTime}`);
    return true;
  }
}
