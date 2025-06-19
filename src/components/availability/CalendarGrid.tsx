
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import CalendarDay from './CalendarDay';
import DaySlotDetails from './DaySlotDetails';
import { CalendarCell } from '@/utils/calendarGridUtils';

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

interface CalendarGridProps {
  calendarGrid: CalendarCell[];
  bookedSlotsByDate: Record<string, Set<string>>;
  onToggleSlotStatus: (slot: AvailabilitySlot) => void;
  isUpdating: boolean;
  fieldId: string;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  calendarGrid,
  bookedSlotsByDate,
  onToggleSlotStatus,
  isUpdating,
  fieldId
}) => {
  return (
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
        const bookedSlots = bookedSlotsByDate[cell.dateStr] || new Set();
        
        console.log(`📅 Rendu cellule ${index}: ${cell.dateStr} (${dayName}, jour ${dayOfWeek})`, {
          slots: cell.slots.length,
          bookedSlotsCount: bookedSlots.size,
          bookedSlotsList: Array.from(bookedSlots),
          availableSlots: cell.slots.filter(s => s.is_available).length,
          unavailableSlots: cell.slots.filter(s => !s.is_available).length
        });
        
        return (
          <Dialog key={`${cell.dateStr}-${index}`}>
            <DialogTrigger asChild>
              <div>
                <CalendarDay 
                  day={cell.date} 
                  slots={cell.slots}
                  bookedSlots={bookedSlots}
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
                onToggleSlotStatus={onToggleSlotStatus}
                isUpdating={isUpdating}
                fieldId={fieldId}
              />
            </DialogContent>
          </Dialog>
        );
      })}
    </div>
  );
};

export default CalendarGrid;
