
interface TimeExclusion {
  date: Date;
  startTime: string;
  endTime: string;
  reason?: string;
}

interface ExtractedSlotConfig {
  startTime: string;
  endTime: string;
  slotDuration: number;
  excludeDays: number[];
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

export const extractSlotConfiguration = (slots: AvailabilitySlot[]): ExtractedSlotConfig => {
  if (slots.length === 0) {
    return {
      startTime: '08:00',
      endTime: '22:00',
      slotDuration: 30,
      excludeDays: []
    };
  }

  // Trouver l'heure de début la plus tôt et l'heure de fin la plus tard
  const startTimes = slots.map(slot => slot.start_time).sort();
  const endTimes = slots.map(slot => slot.end_time).sort();
  
  const earliestStart = startTimes[0];
  const latestEnd = endTimes[endTimes.length - 1];

  // Calculer la durée des créneaux en prenant le plus commun
  const durations = new Map<number, number>();
  
  slots.forEach(slot => {
    const startMinutes = timeToMinutes(slot.start_time);
    const endMinutes = timeToMinutes(slot.end_time);
    const duration = endMinutes - startMinutes;
    
    durations.set(duration, (durations.get(duration) || 0) + 1);
  });

  // Prendre la durée la plus fréquente
  let mostCommonDuration = 30; // valeur par défaut
  let maxCount = 0;
  
  durations.forEach((count, duration) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonDuration = duration;
    }
  });

  // Déterminer les jours exclus en analysant les dates
  const daysWithSlots = new Set<number>();
  slots.forEach(slot => {
    const date = new Date(slot.date);
    daysWithSlots.add(date.getDay());
  });

  const allDays = [0, 1, 2, 3, 4, 5, 6];
  const excludeDays = allDays.filter(day => !daysWithSlots.has(day));

  return {
    startTime: earliestStart,
    endTime: latestEnd,
    slotDuration: mostCommonDuration,
    excludeDays
  };
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};
