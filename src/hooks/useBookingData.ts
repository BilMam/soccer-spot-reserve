
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeTime } from '@/utils/timeUtils';

interface BookingSlot {
  start_time: string;
  end_time: string;
}

interface BookingChange {
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  payment_status: string;
  field_id: string;
}

export const useBookingData = (fieldId: string, startDateStr: string, endDateStr: string) => {
  const [bookedSlotsByDate, setBookedSlotsByDate] = useState<Record<string, Set<string>>>({});
  const [bookingsByDate, setBookingsByDate] = useState<Record<string, BookingSlot[]>>({});

  const processBookings = useCallback((bookings: any[]) => {
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

    return { bookedByDate, bookingsByDateMap };
  }, []);

  const fetchBookedSlots = useCallback(async () => {
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

      const { bookedByDate, bookingsByDateMap } = processBookings(bookings || []);

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
  }, [fieldId, startDateStr, endDateStr, processBookings]);

  // Gestion des changements en temps réel
  const handleRealtimeChange = useCallback((payload: any) => {
    console.log('🔄 Changement temps réel reçu:', payload);
    
    const booking = payload.new || payload.old;
    if (!booking || booking.field_id !== fieldId) {
      return; // Ignorer si ce n'est pas pour ce terrain
    }

    const bookingDate = booking.booking_date;
    if (bookingDate < startDateStr || bookingDate > endDateStr) {
      return; // Ignorer si en dehors de la plage de dates
    }

    // Rafraîchir les données après un délai pour éviter trop de requêtes
    setTimeout(() => {
      fetchBookedSlots();
    }, 100);
  }, [fieldId, startDateStr, endDateStr, fetchBookedSlots]);

  useEffect(() => {
    if (fieldId && startDateStr && endDateStr) {
      fetchBookedSlots();
    }
  }, [fieldId, startDateStr, endDateStr, fetchBookedSlots]);

  // Configuration du listener temps réel
  useEffect(() => {
    if (!fieldId) return;

    console.log('🔄 Configuration listener temps réel pour le terrain:', fieldId);

    const channel = supabase
      .channel('booking-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Écouter tous les événements (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'bookings',
          filter: `field_id=eq.${fieldId}` // Filtrer par terrain
        },
        handleRealtimeChange
      )
      .subscribe();

    return () => {
      console.log('🔄 Nettoyage listener temps réel');
      supabase.removeChannel(channel);
    };
  }, [fieldId, handleRealtimeChange]);

  return { bookedSlotsByDate, bookingsByDate };
};
