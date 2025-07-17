
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

export interface CalendarCell {
  date: Date | null;
  dateStr: string;
  slots: AvailabilitySlot[];
  isEmpty: boolean;
}

export const generateCalendarGrid = (
  startDate: Date,
  endDate: Date,
  slotsByDate: Record<string, AvailabilitySlot[]>
): CalendarCell[] => {
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
