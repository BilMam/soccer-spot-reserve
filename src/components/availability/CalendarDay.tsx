
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { normalizeTime } from '@/utils/timeUtils';

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

interface CalendarDayProps {
  day: Date;
  slots: AvailabilitySlot[];
  bookedSlots: Set<string>;
  onClick: () => void;
}

const CalendarDay: React.FC<CalendarDayProps> = ({ day, slots, bookedSlots, onClick }) => {
  const dateStr = format(day, 'yyyy-MM-dd');
  
  // Calculer les statistiques pour ce jour
  const total = slots.length;
  const available = slots.filter(s => s.is_available).length;
  const unavailable = slots.filter(s => !s.is_available).length;
  
  // CORRECTION PRINCIPALE: Vérifier si chaque slot est réservé
  const booked = slots.filter(slot => {
    const normalizedStartTime = normalizeTime(slot.start_time);
    const normalizedEndTime = normalizeTime(slot.end_time);
    const slotKey = `${normalizedStartTime}-${normalizedEndTime}`;
    const isBooked = bookedSlots.has(slotKey);
    
    if (dateStr === '2025-06-25' || isBooked) {
      console.log(`🎨📅 CalendarDay - VÉRIFICATION SLOT ${dateStr}:`, {
        slotOriginal: `${slot.start_time}-${slot.end_time}`,
        slotKey,
        isBooked,
        bookedSlotsSize: bookedSlots.size,
        bookedSlotsArray: Array.from(bookedSlots)
      });
    }
    
    return isBooked;
  }).length;
  
  const hasSlots = total > 0;
  const hasUnavailable = unavailable > 0;
  const hasBooked = booked > 0;
  const isFullyAvailable = hasSlots && unavailable === 0 && booked === 0;

  // CORRECTION: Déterminer la couleur de fond avec priorité aux réservations
  let bgColor = 'bg-gray-50 border-gray-200';
  let textColor = 'text-gray-600';
  
  if (hasUnavailable) {
    // Rouge si indisponible (priorité la plus haute)
    bgColor = 'bg-red-50 border-red-200';
    textColor = 'text-red-700';
  } else if (hasBooked) {
    // Bleu si réservé (priorité élevée)
    bgColor = 'bg-blue-50 border-blue-200';
    textColor = 'text-blue-700';
  } else if (isFullyAvailable) {
    // Vert si tout disponible
    bgColor = 'bg-green-50 border-green-200';
    textColor = 'text-green-700';
  }

  console.log(`🎨📅 CalendarDay - RENDU FINAL ${dateStr}:`, {
    total,
    available,
    unavailable,
    booked,
    hasBooked,
    bgColor,
    textColor,
    bookedSlotsFromSet: bookedSlots.size
  });

  return (
    <Button
      variant="ghost"
      className={`h-16 p-2 flex flex-col items-center justify-center border cursor-pointer hover:shadow-md transition-all ${bgColor}`}
      onClick={onClick}
    >
      <span className={`font-medium ${textColor}`}>{day.getDate()}</span>
      {hasSlots && (
        <div className="flex gap-1 mt-1 flex-wrap justify-center">
          {available > 0 && booked === 0 && unavailable === 0 && (
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
