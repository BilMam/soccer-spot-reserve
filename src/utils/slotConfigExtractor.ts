
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
  daySpecificTimes?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
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
      excludeDays: [],
      daySpecificTimes: []
    };
  }

  console.log('🔍 Extraction configuration - Créneaux reçus:', slots.length);

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

  // Analyser les jours présents dans les créneaux
  const dateRange = getDateRangeFromSlots(slots);
  const daysInSlotsSet = new Set<number>();
  
  // Analyser chaque créneau pour voir quels jours de la semaine sont présents
  slots.forEach(slot => {
    const [year, month, day] = slot.date.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    daysInSlotsSet.add(dayOfWeek);
    
    console.log(`🔍 Créneau analysé: ${slot.date} -> jour ${dayOfWeek} (${getDayName(dayOfWeek)})`);
  });

  // Calculer quels jours devraient être présents dans la période complète
  const expectedDaysSet = new Set<number>();
  const current = new Date(dateRange.start);
  while (current <= dateRange.end) {
    expectedDaysSet.add(current.getDay());
    current.setDate(current.getDate() + 1);
  }

  // Les jours exclus sont ceux qui devraient être présents mais qui ne le sont pas
  const excludeDays: number[] = [];
  expectedDaysSet.forEach(dayOfWeek => {
    if (!daysInSlotsSet.has(dayOfWeek)) {
      excludeDays.push(dayOfWeek);
      console.log(`🚫 Jour ${dayOfWeek} (${getDayName(dayOfWeek)}) exclu - attendu mais pas trouvé dans les créneaux`);
    }
  });

  console.log('📊 Analyse des jours:', {
    daysInSlots: Array.from(daysInSlotsSet).map(d => `${d}(${getDayName(d)})`),
    expectedDays: Array.from(expectedDaysSet).map(d => `${d}(${getDayName(d)})`),
    excludeDays: excludeDays.map(d => `${d}(${getDayName(d)})`)
  });

  const result = {
    startTime: earliestStart,
    endTime: latestEnd,
    slotDuration: mostCommonDuration,
    excludeDays,
    daySpecificTimes: []
  };

  console.log('✅ Configuration extraite:', result);
  return result;
};

const getDayName = (dayOfWeek: number): string => {
  const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  return days[dayOfWeek] || 'inconnu';
};

const getDateRangeFromSlots = (slots: AvailabilitySlot[]): { start: Date, end: Date } => {
  const dates = slots.map(slot => {
    const [year, month, day] = slot.date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }).sort((a, b) => a.getTime() - b.getTime());
  
  return {
    start: dates[0],
    end: dates[dates.length - 1]
  };
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};
