
import { normalizeTime } from '@/utils/timeUtils';
import { SlotOverlapUtils } from './SlotOverlapUtils';

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
  on_hold_until?: string;
  hold_cagnotte_id?: string;
}

interface BookingSlot {
  start_time: string;
  end_time: string;
}

export class SlotStatusUtils {
  private availableSlots: AvailabilitySlot[];
  private bookedSlots: Set<string>;
  private bookings: BookingSlot[];
  private overlapUtils: SlotOverlapUtils;
  private selectedDate: Date;

  constructor(availableSlots: AvailabilitySlot[], bookedSlots: Set<string>, bookings: BookingSlot[] = [], selectedDate: Date) {
    this.availableSlots = availableSlots;
    this.bookedSlots = bookedSlots;
    this.bookings = bookings;
    this.overlapUtils = new SlotOverlapUtils(bookings);
    this.selectedDate = selectedDate;
  }

  // Vérifier si un créneau spécifique est réservé (méthode héritée)
  isSlotBooked(startTime: string, endTime: string): boolean {
    const normalizedStart = normalizeTime(startTime);
    const normalizedEnd = normalizeTime(endTime);
    const slotKey = `${normalizedStart}-${normalizedEnd}`;
    const isBooked = this.bookedSlots.has(slotKey);
    console.log('🔍 Vérification réservation exacte:', slotKey, 'isBooked:', isBooked);
    return isBooked;
  }

  // NOUVELLE: Vérifier si une heure de début chevauche avec des réservations
  isStartTimeOverlapping(startTime: string): boolean {
    return this.overlapUtils.isTimeOverlappingWithBooking(startTime);
  }

  // NOUVELLE: Vérifier si une plage chevauche avec des réservations
  isRangeOverlapping(startTime: string, endTime: string): boolean {
    return this.overlapUtils.isRangeOverlappingWithBookings(startTime, endTime);
  }

  // Vérifier si un créneau est disponible (existe et is_available = true)
  isSlotAvailable(startTime: string, endTime: string): boolean {
    const normalizedStart = normalizeTime(startTime);
    const normalizedEnd = normalizeTime(endTime);
    
    const slot = this.availableSlots.find(s => {
      const slotNormalizedStart = normalizeTime(s.start_time);
      const slotNormalizedEnd = normalizeTime(s.end_time);
      return slotNormalizedStart === normalizedStart && slotNormalizedEnd === normalizedEnd;
    });
    
    const available = slot ? slot.is_available : false;
    console.log('🔍 isSlotAvailable:', `${normalizedStart}-${normalizedEnd}`, 'available:', available);
    return available;
  }

  // MISE À JOUR: Déterminer le statut d'un créneau avec vérification des chevauchements
  getSlotStatus(startTime: string, endTime: string): 'available' | 'booked' | 'unavailable' | 'not_created' | 'on_hold' {
    const normalizedStart = normalizeTime(startTime);
    const normalizedEnd = normalizeTime(endTime);
    
    // 1. Vérifier si le créneau existe dans les créneaux disponibles
    const slot = this.availableSlots.find(s => {
      const slotNormalizedStart = normalizeTime(s.start_time);
      const slotNormalizedEnd = normalizeTime(s.end_time);
      return slotNormalizedStart === normalizedStart && slotNormalizedEnd === normalizedEnd;
    });
    
    if (!slot) {
      console.log('🔍 getSlotStatus: not_created pour', `${normalizedStart}-${normalizedEnd}`);
      return 'not_created';
    }
    
    // 2. PRIORITÉ: Vérifier si le créneau est en HOLD (cagnotte active)
    if (slot.on_hold_until && slot.hold_cagnotte_id) {
      const holdUntil = new Date(slot.on_hold_until);
      const now = new Date();
      if (holdUntil > now) {
        console.log('🔒 getSlotStatus: on_hold (HOLD actif) pour', `${normalizedStart}-${normalizedEnd}`);
        return 'on_hold';
      } else {
        console.log('✅ HOLD expiré, slot redevient disponible:', `${normalizedStart}-${normalizedEnd}`);
      }
    }
    
    // 3. Vérifier les chevauchements avec les réservations
    if (this.isRangeOverlapping(startTime, endTime)) {
      console.log('🔍 getSlotStatus: booked (chevauchement) pour', `${normalizedStart}-${normalizedEnd}`);
      return 'booked';
    }
    
    // 4. Vérifier la réservation exacte (ancien système)
    if (this.isSlotBooked(startTime, endTime)) {
      console.log('🔍 getSlotStatus: booked (exact) pour', `${normalizedStart}-${normalizedEnd}`);
      return 'booked';
    }
    
    // 5. Vérifier la disponibilité du créneau
    if (!slot.is_available) {
      console.log('🔍 getSlotStatus: unavailable pour', `${normalizedStart}-${normalizedEnd}`);
      return 'unavailable';
    }
    
    console.log('🔍 getSlotStatus: available pour', `${normalizedStart}-${normalizedEnd}`);
    return 'available';
  }

  // MISE À JOUR: Vérifier le statut pour les heures de début (avec chevauchements)
  getStartTimeStatus(startTime: string): 'available' | 'booked' | 'unavailable' | 'not_created' | 'on_hold' {
    // Vérifier si c'est une heure passée pour aujourd'hui
    if (this.isPastTime(startTime)) {
      console.log('🔍 getStartTimeStatus: unavailable (heure passée) pour', startTime);
      return 'unavailable';
    }
    
    // Créer un créneau de 30 minutes pour tester
    const endTime = `${String(Math.floor((timeToMinutes(startTime) + 30) / 60)).padStart(2, '0')}:${String((timeToMinutes(startTime) + 30) % 60).padStart(2, '0')}`;
    
    // D'abord vérifier les chevauchements avec les réservations existantes
    if (this.isStartTimeOverlapping(startTime)) {
      console.log('🔍 getStartTimeStatus: booked (chevauchement) pour heure de début', startTime);
      return 'booked';
    }
    
    // Puis utiliser la logique normale
    return this.getSlotStatus(startTime, endTime);
  }

  // Vérifier si l'heure est déjà passée pour la date d'aujourd'hui
  private isPastTime(time: string): boolean {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedDay = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), this.selectedDate.getDate());
    
    // Si la date sélectionnée n'est pas aujourd'hui, toutes les heures sont valides
    if (selectedDay.getTime() !== today.getTime()) {
      return false;
    }
    
    // Si c'est aujourd'hui, vérifier si l'heure est passée
    const [hours, minutes] = time.split(':').map(Number);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    return (hours < currentHour) || (hours === currentHour && minutes <= currentMinute);
  }
}

// Fonction utilitaire pour obtenir les minutes à partir d'une heure
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

