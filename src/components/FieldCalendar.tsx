
import React, { useState } from 'react';
import { format } from 'date-fns';
import { useFieldAvailability } from '@/hooks/useFieldAvailability';
import CalendarDateSelector from '@/components/calendar/CalendarDateSelector';
import SlotBookingInterface from '@/components/calendar/SlotBookingInterface';
import type { FieldPricing } from '@/types/pricing';

interface FieldCalendarProps {
  fieldId: string;
  pricing: FieldPricing;
  onTimeSlotSelect: (date: Date, startTime: string, endTime: string, subtotal: number, serviceFee: number, total: number) => void;
}

const FieldCalendar: React.FC<FieldCalendarProps> = ({
  fieldId,
  pricing,
  onTimeSlotSelect
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { useFieldAvailabilityForPeriod } = useFieldAvailability(fieldId);
  
  const startDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const endDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  
  const { data: availableSlots = [], isLoading } = useFieldAvailabilityForPeriod(startDateStr, endDateStr);

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
