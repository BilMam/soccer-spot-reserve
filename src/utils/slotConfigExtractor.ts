
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
    console.log('Aucun créneau existant, configuration par défaut');
    return {
      startTime: '08:00',
      endTime: '22:00',
      slotDuration: 30,
      excludeDays: [],
      daySpecificTimes: []
    };
  }

  // 1️⃣ Trouver l'horaire global théorique (earliestStart / latestEnd sur toute la période)
  const allStarts = slots.map(s => s.start_time).sort();
  const allEnds = slots.map(s => s.end_time).sort();
  const globalStart = allStarts[0];
  const globalEnd = allEnds[allEnds.length - 1];

  // 2️⃣ Calculer la durée la plus commune des créneaux
  const durations = slots.map(s => {
    const start = timeToMinutes(s.start_time);
    const end = timeToMinutes(s.end_time);
    return end - start;
  });
  
  const durationCounts = new Map<number, number>();
  durations.forEach(d => {
    durationCounts.set(d, (durationCounts.get(d) || 0) + 1);
  });
  
  let mostCommonDuration = 30;
  let maxCount = 0;
  durationCounts.forEach((count, duration) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonDuration = duration;
    }
  });

  console.log('📊 Extraction config - Global:', {
    globalStart,
    globalEnd,
    slotDuration: mostCommonDuration,
    totalSlots: slots.length
  });

  // 3️⃣ Pour chaque dayOfWeek présent, calculer son min start, max end, et compter les créneaux
  const perDay = new Map<number, { earliest: string; latest: string; count: number }>();

  slots.forEach(slot => {
    const [y, m, d] = slot.date.split('-').map(Number);
    const jsDate = new Date(y, m - 1, d);
    const dow = jsDate.getDay(); // 0 = dimanche, 1 = lundi, etc.

    if (!perDay.has(dow)) {
      perDay.set(dow, { earliest: slot.start_time, latest: slot.end_time, count: 1 });
    } else {
      const current = perDay.get(dow)!;
      current.count++;
      if (slot.start_time < current.earliest) {
        current.earliest = slot.start_time;
      }
      if (slot.end_time > current.latest) {
        current.latest = slot.end_time;
      }
    }
  });

  // Calculer le nombre moyen de créneaux par jour pour détecter les anomalies
  const dayCounts = Array.from(perDay.values()).map(d => d.count);
  const maxDayCount = Math.max(...dayCounts);

  // 4️⃣ Construire daySpecificTimes = jours où l'horaire n'est pas le même que le global
  // IMPORTANT: ignorer les jours avec anormalement peu de créneaux (données tronquées/corrompues)
  const daySpecificTimes: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }> = [];

  perDay.forEach((times, dow) => {
    const dayName = getDayName(dow);

    // Si ce jour a moins de 50% des créneaux du jour le plus complet,
    // c'est probablement des données tronquées → on ignore (utiliser l'horaire global)
    if (times.count < maxDayCount * 0.5) {
      console.log(`  ⚠️ ${dayName}: ${times.count} créneaux (vs max ${maxDayCount}) → données incomplètes, horaire global utilisé`);
      return;
    }

    // Si ce jour a des horaires différents du global, on l'ajoute
    if (times.earliest !== globalStart || times.latest !== globalEnd) {
      daySpecificTimes.push({
        dayOfWeek: dow,
        startTime: times.earliest,
        endTime: times.latest
      });

      console.log(`  🕒 Horaires spécifiques pour ${dayName}: ${times.earliest}-${times.latest} (vs global ${globalStart}-${globalEnd})`);
    }
  });

  // 5️⃣ IMPORTANT : n'essaie plus d'inférer excludeDays à partir des slots.
  // Laisse excludeDays = [] par défaut. On ne veut plus exclure agressivement un jour sans l'action explicite du user.
  const excludeDays: number[] = [];
  
  console.log('✅ Configuration finale extraite:', {
    startTime: globalStart,
    endTime: globalEnd,
    slotDuration: mostCommonDuration,
    excludeDays: excludeDays,
    daySpecificTimes: daySpecificTimes.length > 0 ? daySpecificTimes : []
  });

  return {
    startTime: globalStart,
    endTime: globalEnd,
    slotDuration: mostCommonDuration,
    excludeDays: excludeDays,
    daySpecificTimes: daySpecificTimes
  };
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
