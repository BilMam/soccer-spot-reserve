
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

interface CalendarCell {
  date: Date | null;
  dateStr: string;
  slots: AvailabilitySlot[];
  isEmpty: boolean;
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

  // Générer la grille du calendrier avec alignement correct
  const generateCalendarGrid = (): CalendarCell[] => {
    const grid: CalendarCell[] = [];
    
    // Générer tous les jours de la période
    const periodDays: Date[] = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    while (current <= end) {
      periodDays.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    console.log('📅 Jours de la période:', periodDays.length);
    
    if (periodDays.length === 0) return grid;
    
    // Calculer les cellules vides au début pour aligner le premier jour
    const firstDay = periodDays[0];
    const firstDayOfWeek = firstDay.getDay(); // 0 = dimanche, 1 = lundi, etc.
    
    console.log(`📅 Premier jour: ${format(firstDay, 'yyyy-MM-dd')} (jour ${firstDayOfWeek})`);
    
    // Ajouter des cellules vides au début
    for (let i = 0; i < firstDayOfWeek; i++) {
      grid.push({
        date: null,
        dateStr: '',
        slots: [],
        isEmpty: true
      });
    }
    
    // Ajouter tous les jours de la période
    periodDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const daySlots = slotsByDate[dateStr] || [];
      
      grid.push({
        date: day,
        dateStr,
        slots: daySlots,
        isEmpty: false
      });
      
      console.log(`📅 Ajouté: ${dateStr} (${daySlots.length} créneaux)`);
    });
    
    // Ajouter des cellules vides à la fin pour compléter la dernière semaine
    const remainingCells = 7 - (grid.length % 7);
    if (remainingCells < 7) {
      for (let i = 0; i < remainingCells; i++) {
        grid.push({
          date: null,
          dateStr: '',
          slots: [],
          isEmpty: true
        });
      }
    }
    
    console.log(`📅 Grille générée: ${grid.length} cellules (${periodDays.length} jours + ${grid.length - periodDays.length} cellules vides)`);
    
    return grid;
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

  const calendarGrid = generateCalendarGrid();

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
              {/* En-têtes des jours */}
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                <div key={day} className="p-2 text-center font-medium text-gray-500 border-b">
                  {day}
                </div>
              ))}
              
              {/* Grille du calendrier */}
              {calendarGrid.map((cell, index) => {
                if (cell.isEmpty || !cell.date) {
                  // Cellule vide pour l'alignement
                  return (
                    <div key={`empty-${index}`} className="h-16 bg-gray-50 border border-gray-100 rounded opacity-50">
                    </div>
                  );
                }
                
                const dayOfWeek = cell.date.getDay();
                const dayName = format(cell.date, 'EEEE', { locale: fr });
                
                console.log(`📅 Rendu cellule ${index}: ${cell.dateStr} (${dayName}, jour ${dayOfWeek}) - ${cell.slots.length} créneaux`);
                
                return (
                  <Dialog key={`${cell.dateStr}-${index}`}>
                    <DialogTrigger asChild>
                      <div onClick={() => setSelectedDate(cell.date)}>
                        <CalendarDay 
                          day={cell.date} 
                          slots={cell.slots}
                          onClick={() => {}}
                        />
                      </div>
                    </DialogTrigger>
                    
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {format(cell.date, 'EEEE dd MMMM yyyy', { locale: fr })}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <DaySlotDetails
                        slots={cell.slots}
                        date={cell.date}  
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
