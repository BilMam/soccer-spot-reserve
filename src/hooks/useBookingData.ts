
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeTime } from '@/utils/timeUtils';

interface BookingSlot {
  start_time: string;
  end_time: string;
}

export const useBookingData = (fieldId: string, startDateStr: string, endDateStr: string) => {
  const [bookedSlotsByDate, setBookedSlotsByDate] = useState<Record<string, Set<string>>>({});
  const [bookingsByDate, setBookingsByDate] = useState<Record<string, BookingSlot[]>>({});

  useEffect(() => {
    const fetchBookedSlots = async () => {
      try {
        console.log('🔍🎯 useBookingData - DÉBUT RÉCUPÉRATION:', { fieldId, startDateStr, endDateStr });
        
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

        console.log('🔍🎯 useBookingData - RÉSERVATIONS BRUTES:', bookings);

        const bookedByDate: Record<string, Set<string>> = {};
        const bookingsByDateMap: Record<string, BookingSlot[]> = {};
        
        bookings?.forEach(booking => {
          const dateStr = booking.booking_date;
          if (!bookedByDate[dateStr]) {
            bookedByDate[dateStr] = new Set();
            bookingsByDateMap[dateStr] = [];
          }
          
          // Garder les réservations complètes pour la détection de chevauchement
          bookingsByDateMap[dateStr].push({
            start_time: booking.start_time,
            end_time: booking.end_time
          });
          
          // Conserver aussi l'ancien système pour la compatibilité
          const normalizedStartTime = normalizeTime(booking.start_time);
          const normalizedEndTime = normalizeTime(booking.end_time);
          const slotKey = `${normalizedStartTime}-${normalizedEndTime}`;
          bookedByDate[dateStr].add(slotKey);
          
          console.log('🔍🎯 useBookingData - RÉSERVATION AJOUTÉE:', {
            date: dateStr,
            status: booking.status,
            payment_status: booking.payment_status,
            original: `${booking.start_time}-${booking.end_time}`,
            normalized: slotKey
          });
        });

        setBookedSlotsByDate(bookedByDate);
        setBookingsByDate(bookingsByDateMap);
        
        console.log('📅🎯 useBookingData - RÉSULTAT FINAL:', {
          totalDates: Object.keys(bookedByDate).length,
          bookedByDate: Object.entries(bookedByDate).map(([date, slots]) => ({
            date,
            slotsCount: slots.size,
            slotsList: Array.from(slots)
          })),
          bookingsByDate: Object.entries(bookingsByDateMap).map(([date, bookings]) => ({
            date,
            bookingsCount: bookings.length,
            bookingsList: bookings
          }))
        });
        
      } catch (error) {
        console.error('❌ Erreur lors de la récupération des réservations:', error);
      }
    };

    if (fieldId && startDateStr && endDateStr) {
      fetchBookedSlots();
    }
  }, [fieldId, startDateStr, endDateStr]);

  return { bookedSlotsByDate, bookingsByDate };
};
