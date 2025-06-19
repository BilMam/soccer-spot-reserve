
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

  // Analyser TOUTES les dates de la période pour déterminer les jours exclus
  const dateRange = getDateRangeFromSlots(slots);
  const daysWithSlots = new Set<number>();
  const dayAnalysis = new Map<number, { count: number, dates: string[] }>();

  // Analyser chaque date de slot existant
  slots.forEach(slot => {
    const date = new Date(slot.date + 'T00:00:00');
    const dayOfWeek = date.getDay();
    daysWithSlots.add(dayOfWeek);
    
    if (!dayAnalysis.has(dayOfWeek)) {
      dayAnalysis.set(dayOfWeek, { count: 0, dates: [] });
    }
    const analysis = dayAnalysis.get(dayOfWeek)!;
    if (!analysis.dates.includes(slot.date)) {
      analysis.dates.push(slot.date);
      analysis.count++;
    }
  });

  console.log('📊 Analyse des jours avec créneaux:', {
    daysWithSlots: Array.from(daysWithSlots),
    dayAnalysis: Object.fromEntries(dayAnalysis),
    dateRange
  });

  // Calculer combien de fois chaque jour devrait apparaître dans la période
  const expectedDaysCount = calculateExpectedDaysInRange(dateRange.start, dateRange.end);
  console.log('📅 Jours attendus dans la période:', expectedDaysCount);

  // Déterminer les jours exclus en comparant avec les jours attendus
  const excludeDays: number[] = [];
  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
    const expected = expectedDaysCount[dayOfWeek] || 0;
    const actual = dayAnalysis.get(dayOfWeek)?.count || 0;
    
    // Si un jour n'a aucun créneau alors qu'il devrait en avoir, c'est qu'il est exclu
    if (expected > 0 && actual === 0) {
      excludeDays.push(dayOfWeek);
    }
  }

  const result = {
    startTime: earliestStart,
    endTime: latestEnd,
    slotDuration: mostCommonDuration,
    excludeDays
  };

  console.log('✅ Configuration extraite:', result);
  return result;
};

const getDateRangeFromSlots = (slots: AvailabilitySlot[]): { start: Date, end: Date } => {
  const dates = slots.map(slot => new Date(slot.date + 'T00:00:00')).sort((a, b) => a.getTime() - b.getTime());
  return {
    start: dates[0],
    end: dates[dates.length - 1]
  };
};

const calculateExpectedDaysInRange = (startDate: Date, endDate: Date): Record<number, number> => {
  const expected: Record<number, number> = {};
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    expected[dayOfWeek] = (expected[dayOfWeek] || 0) + 1;
    current.setDate(current.getDate() + 1);
  }

  return expected;
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};
