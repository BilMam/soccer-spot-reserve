
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAvailabilityManagement } from '@/hooks/useAvailabilityManagement';
import DaySlotDetails from './DaySlotDetails';
import CalendarLegend from './CalendarLegend';
import CalendarDay from './CalendarDay';
import UnavailabilityForm from './UnavailabilityForm';

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');
  
  const { data: availabilitySlots = [], isLoading } = useFieldAvailabilityForPeriod(startDateStr, endDateStr);

  // Grouper les créneaux par date
  const slotsByDate = availabilitySlots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, AvailabilitySlot[]>);

  // Générer les jours de la période
  const generateDays = () => {
    const days = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const handleSetUnavailable = async (formData: { startTime: string; endTime: string; reason: string; notes: string }) => {
    if (!selectedDate) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    try {
      await setSlotsUnavailable.mutateAsync({
        date: dateStr,
        startTime: formData.startTime,
        endTime: formData.endTime,
        reason: formData.reason,
        notes: formData.notes
      });
    } catch (error) {
      console.error('Erreur lors de la définition d\'indisponibilité:', error);
    }
  };

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
        <CardHeader>
          <CardTitle>Calendrier des disponibilités</CardTitle>
        </CardHeader>
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

  const days = generateDays();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendrier des disponibilités
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <CalendarLegend />

            {/* Calendrier */}
            <div className="grid grid-cols-7 gap-2">
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                <div key={day} className="p-2 text-center font-medium text-gray-500 border-b">
                  {day}
                </div>
              ))}
              
              {days.map((day, index) => {
                const dateSlots = slotsByDate[format(day, 'yyyy-MM-dd')] || [];
                
                return (
                  <Dialog key={index}>
                    <DialogTrigger asChild>
                      <div onClick={() => setSelectedDate(day)}>
                        <CalendarDay 
                          day={day} 
                          slots={dateSlots}
                          onClick={() => {}}
                        />
                      </div>
                    </DialogTrigger>
                    
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {format(day, 'EEEE dd MMMM yyyy', { locale: fr })}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-6">
                        <DaySlotDetails
                          slots={dateSlots}
                          date={day}
                          onToggleSlotStatus={handleToggleSlotStatus}
                          isUpdating={setSlotsUnavailable.isPending || setSlotsAvailable.isPending}
                        />

                        {dateSlots.length > 0 && (
                          <UnavailabilityForm
                            onSubmit={handleSetUnavailable}
                            isLoading={setSlotsUnavailable.isPending}
                          />
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AvailabilityCalendar;
