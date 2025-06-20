
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { useAvailabilityManagement } from '@/hooks/useAvailabilityManagement';
import { useBookingData } from '@/hooks/useBookingData';
import { generateCalendarGrid } from '@/utils/calendarGridUtils';
import CalendarHeader from './CalendarHeader';
import CalendarLegend from './CalendarLegend';
import CalendarGrid from './CalendarGrid';

interface AvailabilityCalendarProps {
  fieldId: string;
  startDate: Date;
  endDate: Date;
}

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

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  fieldId,
  startDate,
  endDate
}) => {
  const { useFieldAvailabilityForPeriod, setSlotsUnavailable, setSlotsAvailable } = useAvailabilityManagement(fieldId);

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');
  
  const { data: availabilitySlots = [], isLoading: slotsLoading } = useFieldAvailabilityForPeriod(startDateStr, endDateStr);
  const { bookedSlotsByDate, isLoading: bookingsLoading } = useBookingData(fieldId, startDateStr, endDateStr);

  console.log('📅🔄 AvailabilityCalendar - ÉTAT GLOBAL:', {
    fieldId,
    période: { startDateStr, endDateStr },
    availabilitySlots: availabilitySlots.length,
    bookedSlotsByDate: Object.keys(bookedSlotsByDate).length,
    isLoadingSlots: slotsLoading,
    isLoadingBookings: bookingsLoading
  });

  // Grouper les créneaux par date
  const slotsByDate = availabilitySlots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, AvailabilitySlot[]>);

  const handleToggleSlotStatus = async (slot: AvailabilitySlot) => {
    try {
      if (slot.is_available) {
        await setSlotsUnavailable.mutateAsync({
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          reason: 'Marqué manuellement',
          notes: 'Modifié depuis le calendrier'
        });
      } else {
        await setSlotsAvailable.mutateAsync({
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time
        });
      }
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
    }
  };

  if (slotsLoading || bookingsLoading) {
    return (
      <Card>
        <CalendarHeader />
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 21 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const calendarGrid = generateCalendarGrid(startDate, endDate, slotsByDate);

  console.log('📅🔄 AvailabilityCalendar - TRANSMISSION VERS CalendarGrid:', {
    calendarGrid: calendarGrid.length,
    bookedSlotsByDate: Object.entries(bookedSlotsByDate).map(([date, slots]) => ({
      date,
      slotsCount: slots.size,
      slots: Array.from(slots)
    }))
  });

  return (
    <div className="space-y-4">
      <Card>
        <CalendarHeader />
        <CardContent>
          <div className="space-y-4">
            <CalendarLegend />
            <CalendarGrid
              calendarGrid={calendarGrid}
              bookedSlotsByDate={bookedSlotsByDate}
              onToggleSlotStatus={handleToggleSlotStatus}
              isUpdating={setSlotsUnavailable.isPending || setSlotsAvailable.isPending}
              fieldId={fieldId}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AvailabilityCalendar;
