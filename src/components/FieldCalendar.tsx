
import React, { useState } from 'react';
import { format } from 'date-fns';
import { useFieldAvailability } from '@/hooks/useFieldAvailability';
import CalendarDateSelector from '@/components/calendar/CalendarDateSelector';
import SlotBookingInterface from '@/components/calendar/SlotBookingInterface';

interface FieldCalendarProps {
  fieldId: string;
  fieldPrice: number;
  onTimeSlotSelect: (date: Date, startTime: string, endTime: string, price: number) => void;
}

const FieldCalendar: React.FC<FieldCalendarProps> = ({
  fieldId,
  fieldPrice,
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
          fieldPrice={fieldPrice}
          availableSlots={availableSlots}
          isLoading={isLoading}
          onTimeSlotSelect={onTimeSlotSelect}
        />
      )}
    </div>
  );
};

export default FieldCalendar;
