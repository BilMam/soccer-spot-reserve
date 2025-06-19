
import { normalizeTime } from '@/utils/timeUtils';
import { SlotOverlapUtils } from './SlotOverlapUtils';
import { supabase } from '@/integrations/supabase/client';

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

interface BookingSlot {
  start_time: string;
  end_time: string;
}

export class SlotStatusUtils {
  private availableSlots: AvailabilitySlot[];
  private bookedSlots: Set<string>;
  private bookings: BookingSlot[];
  private overlapUtils: SlotOverlapUtils;

  constructor(availableSlots: AvailabilitySlot[], bookedSlots: Set<string>, bookings: BookingSlot[] = []) {
    this.availableSlots = availableSlots;
    this.bookedSlots = bookedSlots;
    this.bookings = bookings;
    this.overlapUtils = new SlotOverlapUtils(bookings);
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
  getSlotStatus(startTime: string, endTime: string): 'available' | 'booked' | 'unavailable' | 'not_created' {
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
    
    // 2. PRIORITÉ: Vérifier les chevauchements avec les réservations (nouveau)
    if (this.isRangeOverlapping(startTime, endTime)) {
      console.log('🔍 getSlotStatus: booked (chevauchement) pour', `${normalizedStart}-${normalizedEnd}`);
      return 'booked';
    }
    
    // 3. Vérifier la réservation exacte (ancien système)
    if (this.isSlotBooked(startTime, endTime)) {
      console.log('🔍 getSlotStatus: booked (exact) pour', `${normalizedStart}-${normalizedEnd}`);
      return 'booked';
    }
    
    // 4. Vérifier la disponibilité du créneau
    if (!slot.is_available) {
      console.log('🔍 getSlotStatus: unavailable pour', `${normalizedStart}-${normalizedEnd}`);
      return 'unavailable';
    }
    
    console.log('🔍 getSlotStatus: available pour', `${normalizedStart}-${normalizedEnd}`);
    return 'available';
  }

  // MISE À JOUR: Vérifier le statut pour les heures de début (avec chevauchements)
  getStartTimeStatus(startTime: string): 'available' | 'booked' | 'unavailable' | 'not_created' {
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
}

// Fonction utilitaire pour obtenir les minutes à partir d'une heure
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const fetchBookedSlots = async (fieldId: string, dateStr: string): Promise<Set<string>> => {
  if (!fieldId || !dateStr) {
    console.log('🔍 Pas de fieldId ou date, skip fetch');
    return new Set();
  }

  console.log('🔍 Vérification réservations pour:', { fieldId, dateStr });

  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('field_id', fieldId)
      .eq('booking_date', dateStr)
      .in('status', ['pending', 'confirmed', 'owner_confirmed']);

    if (error) {
      console.error('Erreur lors de la vérification des réservations:', error);
      return new Set();
    }

    const bookedSlotKeys = new Set(
      bookings?.map(booking => {
        const normalizedStart = normalizeTime(booking.start_time);
        const normalizedEnd = normalizeTime(booking.end_time);
        const slotKey = `${normalizedStart}-${normalizedEnd}`;
        console.log('🔍 Slot réservé normalisé:', slotKey, 'depuis:', booking.start_time, booking.end_time);
        return slotKey;
      }) || []
    );
    
    console.log('🔍 Créneaux réservés récupérés:', Array.from(bookedSlotKeys));
    return bookedSlotKeys;
  } catch (error) {
    console.error('Erreur lors de la vérification des réservations:', error);
    return new Set();
  }
};

// NOUVELLE: Fonction pour récupérer les réservations complètes (pas seulement les clés)
export const fetchBookings = async (fieldId: string, dateStr: string): Promise<BookingSlot[]> => {
  if (!fieldId || !dateStr) {
    console.log('🔍 Pas de fieldId ou date, skip fetch bookings');
    return [];
  }

  console.log('🔍 Récupération réservations complètes pour:', { fieldId, dateStr });

  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('field_id', fieldId)
      .eq('booking_date', dateStr)
      .in('status', ['pending', 'confirmed', 'owner_confirmed']);

    if (error) {
      console.error('Erreur lors de la récupération des réservations:', error);
      return [];
    }

    const bookingSlots = bookings?.map(booking => ({
      start_time: booking.start_time,
      end_time: booking.end_time
    })) || [];
    
    console.log('🔍 Réservations complètes récupérées:', bookingSlots);
    return bookingSlots;
  } catch (error) {
    console.error('Erreur lors de la récupération des réservations:', error);
    return [];
  }
};
