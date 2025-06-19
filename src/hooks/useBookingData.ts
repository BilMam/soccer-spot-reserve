
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeTime } from '@/utils/timeUtils';

export const useBookingData = (fieldId: string, startDateStr: string, endDateStr: string) => {
  const [bookedSlotsByDate, setBookedSlotsByDate] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    const fetchBookedSlots = async () => {
      try {
        console.log('🔍 DÉBUT RÉCUPÉRATION - Paramètres:', { fieldId, startDateStr, endDateStr });
        
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

        console.log('🔍 RÉSERVATIONS BRUTES récupérées:', bookings);

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
          
          console.log('🔍 RÉSERVATION AJOUTÉE:', {
            date: dateStr,
            original: `${booking.start_time}-${booking.end_time}`,
            normalized: slotKey,
            finalKey: slotKey
          });
        });

        setBookedSlotsByDate(bookedByDate);
        console.log('📅 RÉSERVATIONS FINALES par date:', bookedByDate);
        
        // Debug spécifique pour le 25 juin
        if (bookedByDate['2025-06-25']) {
          console.log('🎯 RÉSERVATIONS pour le 2025-06-25:', Array.from(bookedByDate['2025-06-25']));
        }
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
