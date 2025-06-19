
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeTime } from '@/utils/timeUtils';

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
          
          // CORRECTION: Normaliser les heures pour créer des clés cohérentes
          const normalizedStartTime = normalizeTime(booking.start_time);
          const normalizedEndTime = normalizeTime(booking.end_time);
          const slotKey = `${normalizedStartTime}-${normalizedEndTime}`;
          
          bookedByDate[dateStr].add(slotKey);
          
          console.log('🔍 Réservation normalisée ajoutée:', {
            date: dateStr,
            original: `${booking.start_time}-${booking.end_time}`,
            normalized: slotKey
          });
        });

        setBookedSlotsByDate(bookedByDate);
        console.log('📅 Réservations récupérées et normalisées:', bookedByDate);
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
