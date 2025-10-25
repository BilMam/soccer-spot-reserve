
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { isSlotOverlappingWithBooking } from '@/utils/slotOverlapUtils';

interface AvailabilitySlot {
  id?: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  unavailability_reason?: string;
  is_maintenance?: boolean;
  notes?: string;
}

interface BookingSlot {
  start_time: string;
  end_time: string;
}

interface CalendarDayProps {
  day: Date;
  slots: AvailabilitySlot[];
  bookedSlots: Set<string>;
  bookings: BookingSlot[];
  onClick: () => void;
}

const CalendarDay: React.FC<CalendarDayProps> = ({ day, slots, bookedSlots, bookings, onClick }) => {
  // Calculer les statistiques pour ce jour
  const total = slots.length;
  const available = slots.filter(s => s.is_available).length;
  const unavailable = slots.filter(s => !s.is_available).length;
  
  // NOUVELLE LOGIQUE: Utiliser la détection de chevauchement
  const booked = slots.filter(slot => {
    return isSlotOverlappingWithBooking(slot.start_time, slot.end_time, bookings);
  }).length;
  
  const hasSlots = total > 0;
  const hasUnavailable = unavailable > 0;
  const hasBooked = booked > 0;
  const isFullyAvailable = hasSlots && unavailable === 0 && booked === 0;

  // Déterminer la couleur de fond avec priorité
  let bgColor = 'bg-gray-50 border-gray-200';
  if (hasUnavailable) {
    // Rouge si indisponible (priorité la plus haute)
    bgColor = 'bg-red-50 border-red-200';
  } else if (hasBooked) {
    // Bleu si réservé
    bgColor = 'bg-blue-50 border-blue-200';
  } else if (isFullyAvailable) {
    // Vert si tout disponible
    bgColor = 'bg-green-50 border-green-200';
  }

  // DEBUG: Logs ciblés pour les jours avec réservations
  const dateStr = format(day, 'yyyy-MM-dd');
  if (dateStr === '2025-06-25' || hasBooked || bookings.length > 0) {
    console.log(`🎨📅 CalendarDay - ${dateStr}:`, {
      total,
      available,
      unavailable,
      booked,
      hasBooked,
      bgColor,
      bookingsReceived: bookings.length,
      bookingsList: bookings,
      // Vérifier chaque slot individuellement
      slotChecks: slots.map(slot => {
        const overlaps = isSlotOverlappingWithBooking(slot.start_time, slot.end_time, bookings);
        return {
          slotTime: `${slot.start_time}-${slot.end_time}`,
          isAvailable: slot.is_available,
          overlapsWithBooking: overlaps
        };
      })
    });
  }

  return (
    <Button
      variant="ghost"
      className={`h-16 p-2 flex flex-col items-center justify-center border cursor-pointer hover:shadow-md transition-all ${bgColor}`}
      onClick={onClick}
    >
      <span className="font-medium">{day.getDate()}</span>
      {hasSlots && (
        <div className="flex gap-1 mt-1">
          {available > 0 && booked === 0 && (
            <Badge variant="secondary" className="text-xs px-1 py-0 bg-green-100 text-green-700">
              {available}
            </Badge>
          )}
          {booked > 0 && (
            <Badge variant="secondary" className="text-xs px-1 py-0 bg-blue-100 text-blue-700">
              {booked}
            </Badge>
          )}
          {unavailable > 0 && (
            <Badge variant="secondary" className="text-xs px-1 py-0 bg-red-100 text-red-700">
              {unavailable}
            </Badge>
          )}
        </div>
      )}
    </Button>
  );
};

export default CalendarDay;
