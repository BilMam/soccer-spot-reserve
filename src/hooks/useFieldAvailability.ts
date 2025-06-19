
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { timeToMinutes, minutesToTime } from '@/utils/timeUtils';

interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
  price: number;
}

export const generateDefaultTimeSlots = (fieldPrice: number): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 8; hour < 22; hour++) {
    for (let minute of [0, 30]) {
      if (hour === 21 && minute === 30) break; // Don't add 21:30-22:00 as it goes beyond 22:00
      
      const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const endMinutes = hour * 60 + minute + 30;
      const endTime = minutesToTime(endMinutes);
      
      slots.push({
        start_time: startTime,
        end_time: endTime,
        is_available: true,
        price: fieldPrice / 2 // Prix pour 30 minutes
      });
    }
  }
  return slots;
};

export const useFieldAvailability = (fieldId: string, selectedDate: Date | undefined, fieldPrice: number) => {
  return useQuery({
    queryKey: ['field-availability', fieldId, selectedDate],
    queryFn: async () => {
      if (!selectedDate) return generateDefaultTimeSlots(fieldPrice);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Récupérer les créneaux existants pour cette date
      const { data: existingSlots, error: slotsError } = await supabase
        .from('field_availability')
        .select('*')
        .eq('field_id', fieldId)
        .eq('date', dateStr);
      
      if (slotsError) throw slotsError;

      // Récupérer les réservations existantes pour cette date
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('field_id', fieldId)
        .eq('booking_date', dateStr)
        .in('status', ['pending', 'confirmed']);
      
      if (bookingsError) throw bookingsError;

      const defaultSlots = generateDefaultTimeSlots(fieldPrice);

      // Marquer les créneaux déjà réservés comme non disponibles
      return defaultSlots.map(slot => {
        // Vérifier si ce créneau est dans une réservation existante
        const isBooked = bookings?.some(booking => {
          const bookingStart = timeToMinutes(booking.start_time);
          const bookingEnd = timeToMinutes(booking.end_time);
          const slotStart = timeToMinutes(slot.start_time);
          const slotEnd = timeToMinutes(slot.end_time);

          // Vérifier si le créneau chevauche avec une réservation
          return (slotStart >= bookingStart && slotStart < bookingEnd) ||
                 (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
                 (slotStart <= bookingStart && slotEnd >= bookingEnd);
        });

        // Vérifier s'il y a une disponibilité personnalisée pour ce créneau
        const customSlot = existingSlots?.find(es => 
          es.start_time === slot.start_time && es.end_time === slot.end_time
        );

        return {
          ...slot,
          is_available: isBooked ? false : (customSlot?.is_available ?? slot.is_available),
          price: customSlot?.price_override ?? slot.price
        };
      });
    },
    enabled: !!selectedDate
  });
};
