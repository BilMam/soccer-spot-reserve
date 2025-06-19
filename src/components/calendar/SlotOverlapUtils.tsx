
import { timeToMinutes, normalizeTime } from '@/utils/timeUtils';

interface BookingSlot {
  start_time: string;
  end_time: string;
}

export class SlotOverlapUtils {
  private bookings: BookingSlot[];

  constructor(bookings: BookingSlot[]) {
    this.bookings = bookings;
  }

  // Vérifier si une heure de début chevauche avec une réservation existante
  isTimeOverlappingWithBooking(startTime: string): boolean {
    if (!startTime || this.bookings.length === 0) return false;
    
    const startMinutes = timeToMinutes(startTime);
    
    console.log('🔍⚡ Vérification chevauchement pour heure de début:', startTime);
    
    for (const booking of this.bookings) {
      const bookingStartMinutes = timeToMinutes(normalizeTime(booking.start_time));
      const bookingEndMinutes = timeToMinutes(normalizeTime(booking.end_time));
      
      console.log('🔍⚡ Comparaison avec réservation:', {
        booking: `${normalizeTime(booking.start_time)}-${normalizeTime(booking.end_time)}`,
        bookingStartMinutes,
        bookingEndMinutes,
        startMinutes
      });
      
      // Si l'heure de début tombe dans une réservation existante
      if (startMinutes >= bookingStartMinutes && startMinutes < bookingEndMinutes) {
        console.log('🔍⚡ CHEVAUCHEMENT DÉTECTÉ avec réservation:', `${normalizeTime(booking.start_time)}-${normalizeTime(booking.end_time)}`);
        return true;
      }
    }
    
    console.log('🔍⚡ Aucun chevauchement trouvé pour:', startTime);
    return false;
  }

  // Vérifier si une plage horaire chevauche avec des réservations
  isRangeOverlappingWithBookings(startTime: string, endTime: string): boolean {
    if (!startTime || !endTime || this.bookings.length === 0) return false;
    
    const rangeStartMinutes = timeToMinutes(startTime);
    const rangeEndMinutes = timeToMinutes(endTime);
    
    console.log('🔍⚡ Vérification chevauchement pour plage:', `${startTime}-${endTime}`);
    
    for (const booking of this.bookings) {
      const bookingStartMinutes = timeToMinutes(normalizeTime(booking.start_time));
      const bookingEndMinutes = timeToMinutes(normalizeTime(booking.end_time));
      
      // Vérifier tous les types de chevauchements possibles
      const hasOverlap = (
        // La plage commence dans une réservation
        (rangeStartMinutes >= bookingStartMinutes && rangeStartMinutes < bookingEndMinutes) ||
        // La plage finit dans une réservation
        (rangeEndMinutes > bookingStartMinutes && rangeEndMinutes <= bookingEndMinutes) ||
        // La plage englobe complètement une réservation
        (rangeStartMinutes <= bookingStartMinutes && rangeEndMinutes >= bookingEndMinutes) ||
        // Une réservation englobe complètement la plage
        (bookingStartMinutes <= rangeStartMinutes && bookingEndMinutes >= rangeEndMinutes)
      );
      
      if (hasOverlap) {
        console.log('🔍⚡ CHEVAUCHEMENT DE PLAGE DÉTECTÉ avec réservation:', `${normalizeTime(booking.start_time)}-${normalizeTime(booking.end_time)}`);
        return true;
      }
    }
    
    console.log('🔍⚡ Aucun chevauchement de plage trouvé pour:', `${startTime}-${endTime}`);
    return false;
  }
}
