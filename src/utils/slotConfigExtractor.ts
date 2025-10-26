
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

  // ⚠️ NE PAS essayer de deviner les jours exclus à partir des créneaux existants
  // L'utilisateur doit les gérer manuellement dans l'interface
  const excludeDays: number[] = [];
  
  console.log('ℹ️ excludeDays défini à vide - l\'utilisateur doit gérer manuellement les exclusions');
  console.log('📊 Analyse des jours:', {
    daysInSlots: Array.from(daysInSlotsSet).map(d => `${d}(${getDayName(d)})`),
    expectedDays: Array.from(expectedDaysSet).map(d => `${d}(${getDayName(d)})`)
  });

  // Détecter les horaires spécifiques par jour
  const daySpecificTimes: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }> = [];

  // Analyser les horaires pour chaque jour présent
  daysInSlotsSet.forEach(dayOfWeek => {
    const slotsForDay = slots.filter(slot => {
      const [year, month, day] = slot.date.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.getDay() === dayOfWeek;
    });
    
    if (slotsForDay.length > 0) {
      const dayStartTimes = slotsForDay.map(s => s.start_time).sort();
      const dayEndTimes = slotsForDay.map(s => s.end_time).sort();
      
      const dayEarliestStart = dayStartTimes[0];
      const dayLatestEnd = dayEndTimes[dayEndTimes.length - 1];
      
      // Si les horaires de ce jour diffèrent des horaires globaux, ajouter
      if (dayEarliestStart !== earliestStart || dayLatestEnd !== latestEnd) {
        daySpecificTimes.push({
          dayOfWeek,
          startTime: dayEarliestStart,
          endTime: dayLatestEnd
        });
        console.log(`⏰ Horaires spécifiques détectés pour ${getDayName(dayOfWeek)}: ${dayEarliestStart}-${dayLatestEnd}`);
      }
    }
  });

  const result = {
    startTime: earliestStart,
    endTime: latestEnd,
    slotDuration: mostCommonDuration,
    excludeDays,
    daySpecificTimes
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
