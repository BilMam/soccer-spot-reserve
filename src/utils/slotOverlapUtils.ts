
import { timeToMinutes, normalizeTime } from './timeUtils';

interface BookingSlot {
  start_time: string;
  end_time: string;
}

// Fonction pour vérifier si un créneau de 30 minutes chevauche avec une réservation
export const isSlotOverlappingWithBooking = (
  slotStartTime: string,
  slotEndTime: string,
  bookings: BookingSlot[]
): boolean => {
  if (!slotStartTime || !slotEndTime || bookings.length === 0) return false;
  
  const slotStartMinutes = timeToMinutes(slotStartTime);
  const slotEndMinutes = timeToMinutes(slotEndTime);
  
  console.log('🔍⚡ Vérification chevauchement pour créneau:', `${slotStartTime}-${slotEndTime}`);
  
  for (const booking of bookings) {
    const bookingStartMinutes = timeToMinutes(normalizeTime(booking.start_time));
    const bookingEndMinutes = timeToMinutes(normalizeTime(booking.end_time));
    
    console.log('🔍⚡ Comparaison avec réservation:', {
      booking: `${normalizeTime(booking.start_time)}-${normalizeTime(booking.end_time)}`,
      bookingStartMinutes,
      bookingEndMinutes,
      slotStartMinutes,
      slotEndMinutes
    });
    
    // Vérifier tous les types de chevauchements possibles
    const hasOverlap = (
      // Le créneau commence dans une réservation
      (slotStartMinutes >= bookingStartMinutes && slotStartMinutes < bookingEndMinutes) ||
      // Le créneau finit dans une réservation
      (slotEndMinutes > bookingStartMinutes && slotEndMinutes <= bookingEndMinutes) ||
      // Le créneau englobe complètement une réservation
      (slotStartMinutes <= bookingStartMinutes && slotEndMinutes >= bookingEndMinutes) ||
      // Une réservation englobe complètement le créneau
      (bookingStartMinutes <= slotStartMinutes && bookingEndMinutes >= slotEndMinutes)
    );
    
    if (hasOverlap) {
      console.log('🔍⚡ CHEVAUCHEMENT DÉTECTÉ avec réservation:', `${normalizeTime(booking.start_time)}-${normalizeTime(booking.end_time)}`);
      return true;
    }
  }
  
  console.log('🔍⚡ Aucun chevauchement trouvé pour:', `${slotStartTime}-${slotEndTime}`);
  return false;
};

// Fonction pour obtenir toutes les réservations d'une date sous forme de BookingSlot[]
export const convertBookedSlotsToBookings = (bookedSlots: Set<string>): BookingSlot[] => {
  return Array.from(bookedSlots).map(slotKey => {
    const [start_time, end_time] = slotKey.split('-');
    return { start_time, end_time };
  });
};
