
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeTime } from '@/utils/timeUtils';

export const useBookingData = (fieldId: string, startDateStr: string, endDateStr: string) => {
  const [bookedSlotsByDate, setBookedSlotsByDate] = useState<Record<string, Set<string>>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!fieldId || !startDateStr || !endDateStr) {
        console.log('🔍📅 useBookingData - Paramètres manquants, skip:', { fieldId, startDateStr, endDateStr });
        return;
      }

      setIsLoading(true);
      
      try {
        console.log('🔍📅 useBookingData - DÉBUT RÉCUPÉRATION:', { fieldId, startDateStr, endDateStr });
        
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('booking_date, start_time, end_time, status, payment_status')
          .eq('field_id', fieldId)
          .gte('booking_date', startDateStr)
          .lte('booking_date', endDateStr)
          .in('status', ['pending', 'confirmed', 'owner_confirmed']);

        if (error) {
          console.error('❌ Erreur lors de la récupération des réservations:', error);
          return;
        }

        console.log('🔍📅 useBookingData - RÉSERVATIONS BRUTES RÉCUPÉRÉES:', {
          count: bookings?.length || 0,
          bookings: bookings
        });

        const bookedByDate: Record<string, Set<string>> = {};
        
        bookings?.forEach(booking => {
          const dateStr = booking.booking_date;
          if (!bookedByDate[dateStr]) {
            bookedByDate[dateStr] = new Set();
          }
          
          const normalizedStartTime = normalizeTime(booking.start_time);
          const normalizedEndTime = normalizeTime(booking.end_time);
          const slotKey = `${normalizedStartTime}-${normalizedEndTime}`;
          
          bookedByDate[dateStr].add(slotKey);
          
          console.log('🔍📅 useBookingData - CRÉNEAU AJOUTÉ:', {
            date: dateStr,
            status: booking.status,
            payment_status: booking.payment_status,
            original: `${booking.start_time}-${booking.end_time}`,
            normalized: slotKey,
            slotKey
          });
        });

        console.log('🔍📅 useBookingData - RÉSULTAT FINAL CONSOLIDÉ:', {
          totalDates: Object.keys(bookedByDate).length,
          detailParDate: Object.entries(bookedByDate).map(([date, slots]) => ({
            date,
            slotsCount: slots.size,
            slotsList: Array.from(slots)
          }))
        });

        setBookedSlotsByDate(bookedByDate);
        
      } catch (error) {
        console.error('❌ Erreur lors de la récupération des réservations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookedSlots();
  }, [fieldId, startDateStr, endDateStr]);

  return { bookedSlotsByDate, isLoading };
};
