
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

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
  onClick: () => void;
}

const CalendarDay: React.FC<CalendarDayProps> = ({ day, slots, onClick }) => {
  // Calculer les statistiques pour ce jour
  const total = slots.length;
  const available = slots.filter(s => s.is_available).length;
  const unavailable = slots.filter(s => !s.is_available).length;
  const hasSlots = total > 0;
  const hasUnavailable = unavailable > 0;
  const isFullyAvailable = hasSlots && unavailable === 0;

  // Déterminer la couleur de fond
  let bgColor = 'bg-gray-50 border-gray-200';
  if (isFullyAvailable) {
    bgColor = 'bg-green-50 border-green-200';
  } else if (hasUnavailable) {
    bgColor = 'bg-red-50 border-red-200';
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
          {available > 0 && (
            <Badge variant="secondary" className="text-xs px-1 py-0 bg-green-100 text-green-700">
              {available}
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
