
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

  console.log('📅 Calendrier - Période:', { startDateStr, endDateStr });
  console.log('📅 Calendrier - Créneaux récupérés:', availabilitySlots.length);

  // Grouper les créneaux par date
  const slotsByDate = availabilitySlots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, AvailabilitySlot[]>);

  console.log('📅 Calendrier - Créneaux par date:', Object.keys(slotsByDate));

  // Générer les jours de la période avec vérification des dates
  const generateDays = () => {
    const days = [];
    const current = new Date(startDate);
    
    console.log('📅 Génération des jours de', format(startDate, 'yyyy-MM-dd'), 'à', format(endDate, 'yyyy-MM-dd'));
    
    while (current <= endDate) {
      // Créer une nouvelle instance de Date pour chaque jour
      const dayDate = new Date(current.getFullYear(), current.getMonth(), current.getDate());
      days.push(dayDate);
      
      // Log détaillé pour débogage
      const dateStr = format(dayDate, 'yyyy-MM-dd');
      const dayOfWeek = dayDate.getDay();
      const dayName = format(dayDate, 'EEEE', { locale: fr });
      const hasSlots = !!slotsByDate[dateStr];
      const slotsCount = hasSlots ? slotsByDate[dateStr].length : 0;
      
      console.log(`📅 Jour généré: ${dateStr} (${dayName}, jour ${dayOfWeek}) - Créneaux: ${slotsCount}`);
      
      // Vérification supplémentaire pour s'assurer de la cohérence
      if (dayName === 'samedi' && dayOfWeek !== 6) {
        console.error(`❌ ERREUR: ${dateStr} est un ${dayName} mais dayOfWeek=${dayOfWeek}`);
      }
      if (dayName === 'mardi' && dayOfWeek !== 2) {
        console.error(`❌ ERREUR: ${dateStr} est un ${dayName} mais dayOfWeek=${dayOfWeek}`);
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
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
                const dateStr = format(day, 'yyyy-MM-dd');
                const dateSlots = slotsByDate[dateStr] || [];
                const dayOfWeek = day.getDay();
                const dayName = format(day, 'EEEE', { locale: fr });
                
                // Log pour vérifier la correspondance jour/date
                console.log(`📅 Rendu jour ${index}: ${dateStr} (${dayName}, jour ${dayOfWeek}) - ${dateSlots.length} créneaux`);
                
                // Vérification finale de cohérence
                const expectedDayName = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][dayOfWeek];
                if (dayName !== expectedDayName) {
                  console.error(`❌ INCOHÉRENCE: ${dateStr} - Nom calculé: ${dayName}, Nom attendu: ${expectedDayName}, dayOfWeek: ${dayOfWeek}`);
                }
                
                return (
                  <Dialog key={`${dateStr}-${index}`}>
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
                      
                      <DaySlotDetails
                        slots={dateSlots}
                        date={day}  
                        onToggleSlotStatus={handleToggleSlotStatus}
                        isUpdating={setSlotsUnavailable.isPending || setSlotsAvailable.isPending}
                        fieldId={fieldId}
                      />
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
