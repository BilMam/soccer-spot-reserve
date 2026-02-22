
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useFieldAvailability } from '@/hooks/useFieldAvailability';
import CalendarDateSelector from '@/components/calendar/CalendarDateSelector';
import SlotBookingInterface from '@/components/calendar/SlotBookingInterface';
import type { FieldPricing } from '@/types/pricing';
import { normalizeTime } from '@/utils/timeUtils';

interface FieldCalendarProps {
  fieldId: string;
  pricing: FieldPricing;
  onTimeSlotSelect: (date: Date, startTime: string, endTime: string, subtotal: number, serviceFee: number, total: number) => void;
  onHoursChange?: (start: string, end: string) => void;
}

const FieldCalendar: React.FC<FieldCalendarProps> = ({
  fieldId,
  pricing,
  onTimeSlotSelect,
  onHoursChange
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { useFieldAvailabilityForPeriod } = useFieldAvailability(fieldId);
  
  const startDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const endDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  
  const { data: availableSlots = [], isLoading } = useFieldAvailabilityForPeriod(startDateStr, endDateStr);

  // Calculer et remonter les horaires du jour sélectionné
  useEffect(() => {
    if (!onHoursChange || availableSlots.length === 0) return;
    
    const times = availableSlots.map(s => ({
      start: normalizeTime(s.start_time),
      end: normalizeTime(s.end_time)
    }));
    
    const firstHour = times.reduce((min, t) => t.start < min ? t.start : min, times[0].start);
    const lastHour = times.reduce((max, t) => t.end > max ? t.end : max, times[0].end);
    
    // 00:00 as end_time means midnight (end of day) — detect 24h/24
    const hasEndMidnight = times.some(t => t.end === '00:00');
    
    if (hasEndMidnight && firstHour === '00:00') {
      onHoursChange('00:00', '00:00');
    } else {
      onHoursChange(firstHour, lastHour);
    }
  }, [availableSlots, onHoursChange]);

  return (
    <div className="space-y-6">
      <CalendarDateSelector
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
      />

      {selectedDate && (
        <SlotBookingInterface
          selectedDate={selectedDate}
          fieldId={fieldId}
          pricing={pricing}
          availableSlots={availableSlots}
          isLoading={isLoading}
          onTimeSlotSelect={onTimeSlotSelect}
        />
      )}
    </div>
  );
};

export default FieldCalendar;
