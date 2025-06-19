
import { normalizeTime } from '@/utils/timeUtils';
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

export class SlotStatusUtils {
  private availableSlots: AvailabilitySlot[];
  private bookedSlots: Set<string>;

  constructor(availableSlots: AvailabilitySlot[], bookedSlots: Set<string>) {
    this.availableSlots = availableSlots;
    this.bookedSlots = bookedSlots;
  }

  // Vérifier si un créneau spécifique est réservé
  isSlotBooked(startTime: string, endTime: string): boolean {
    const normalizedStart = normalizeTime(startTime);
    const normalizedEnd = normalizeTime(endTime);
    const slotKey = `${normalizedStart}-${normalizedEnd}`;
    const isBooked = this.bookedSlots.has(slotKey);
    console.log('🔍 Vérification réservation:', slotKey, 'isBooked:', isBooked);
    return isBooked;
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

  // Déterminer le statut d'un créneau
  getSlotStatus(startTime: string, endTime: string): 'available' | 'booked' | 'unavailable' | 'not_created' {
    const normalizedStart = normalizeTime(startTime);
    const normalizedEnd = normalizeTime(endTime);
    
    const slot = this.availableSlots.find(s => {
      const slotNormalizedStart = normalizeTime(s.start_time);
      const slotNormalizedEnd = normalizeTime(s.end_time);
      return slotNormalizedStart === normalizedStart && slotNormalizedEnd === normalizedEnd;
    });
    
    if (!slot) {
      console.log('🔍 getSlotStatus: not_created pour', `${normalizedStart}-${normalizedEnd}`);
      return 'not_created';
    }
    
    if (this.isSlotBooked(startTime, endTime)) {
      console.log('🔍 getSlotStatus: booked pour', `${normalizedStart}-${normalizedEnd}`);
      return 'booked';
    }
    
    if (!slot.is_available) {
      console.log('🔍 getSlotStatus: unavailable pour', `${normalizedStart}-${normalizedEnd}`);
      return 'unavailable';
    }
    
    console.log('🔍 getSlotStatus: available pour', `${normalizedStart}-${normalizedEnd}`);
    return 'available';
  }
}

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
