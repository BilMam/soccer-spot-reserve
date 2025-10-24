
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { useAvailabilityManagement } from '@/hooks/useAvailabilityManagement';
import { useBookingData } from '@/hooks/useBookingData';
import { useRecurringSlots } from '@/hooks/useRecurringSlots';
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
  is_recurring?: boolean;
  recurring_label?: string;
}

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  fieldId,
  startDate,
  endDate
}) => {
  const { useFieldAvailabilityForPeriod, setSlotsUnavailable, setSlotsAvailable } = useAvailabilityManagement(fieldId);
  const { useRecurringSlotsQuery } = useRecurringSlots(fieldId);

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');
  
  const { data: availabilitySlots = [], isLoading } = useFieldAvailabilityForPeriod(startDateStr, endDateStr);
  const { data: recurringSlots = [] } = useRecurringSlotsQuery();
  const { bookedSlotsByDate, bookingsByDate } = useBookingData(fieldId, startDateStr, endDateStr);

  console.log('📅 Calendrier - Période:', { startDateStr, endDateStr });
  console.log('📅 Calendrier - Créneaux récupérés:', availabilitySlots.length);
  console.log('📅 Calendrier - Créneaux récurrents:', recurringSlots.length);
  console.log('📅 Calendrier - Réservations par date:', bookingsByDate);

  // Grouper les créneaux par date en incluant les créneaux récurrents
  const slotsByDate = availabilitySlots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, AvailabilitySlot[]>);

  // Ajouter les créneaux récurrents actifs aux jours concernés
  const activeRecurringSlots = recurringSlots.filter(rs => rs.is_active);
  
  // Parcourir chaque jour de la période pour ajouter les créneaux récurrents
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const dayOfWeek = currentDate.getDay();
    
    // Trouver les créneaux récurrents pour ce jour
    activeRecurringSlots.forEach(recurringSlot => {
      if (recurringSlot.day_of_week === dayOfWeek) {
        // Vérifier si le créneau est dans la période de validité
        const slotStartDate = new Date(recurringSlot.start_date);
        const slotEndDate = recurringSlot.end_date ? new Date(recurringSlot.end_date) : null;
        
        if (currentDate >= slotStartDate && (!slotEndDate || currentDate <= slotEndDate)) {
          // Vérifier si ce créneau n'existe pas déjà dans les créneaux normaux
          const existingSlot = (slotsByDate[dateStr] || []).find(
            s => s.start_time === recurringSlot.start_time && s.end_time === recurringSlot.end_time
          );
          
          if (!existingSlot) {
            if (!slotsByDate[dateStr]) {
              slotsByDate[dateStr] = [];
            }
            slotsByDate[dateStr].push({
              date: dateStr,
              start_time: recurringSlot.start_time,
              end_time: recurringSlot.end_time,
              is_available: true,
              is_recurring: true,
              recurring_label: recurringSlot.label || undefined
            });
          }
        }
      }
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

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

  if (isLoading) {
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
              bookingsByDate={bookingsByDate}
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
