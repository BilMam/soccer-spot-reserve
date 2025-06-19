
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useBookingData = (fieldId: string, startDateStr: string, endDateStr: string) => {
  const [bookedSlotsByDate, setBookedSlotsByDate] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    const fetchBookedSlots = async () => {
      try {
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('booking_date, start_time, end_time')
          .eq('field_id', fieldId)
          .gte('booking_date', startDateStr)
          .lte('booking_date', endDateStr)
          .in('status', ['pending', 'confirmed', 'owner_confirmed']);

        if (error) {
          console.error('Erreur lors de la récupération des réservations:', error);
          return;
        }

        const bookedByDate: Record<string, Set<string>> = {};
        bookings?.forEach(booking => {
          const dateStr = booking.booking_date;
          if (!bookedByDate[dateStr]) {
            bookedByDate[dateStr] = new Set();
          }
          bookedByDate[dateStr].add(`${booking.start_time}-${booking.end_time}`);
        });

        setBookedSlotsByDate(bookedByDate);
        console.log('📅 Réservations récupérées:', bookedByDate);
      } catch (error) {
        console.error('Erreur lors de la récupération des réservations:', error);
      }
    };

    if (fieldId && startDateStr && endDateStr) {
      fetchBookedSlots();
    }
  }, [fieldId, startDateStr, endDateStr]);

  return { bookedSlotsByDate };
};
