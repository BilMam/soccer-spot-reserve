import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizeTime, formatDateForSupabase } from '@/utils/timeUtils';

export const useAvailableTimesForDate = (fieldId: string, selectedDate: string | Date) => {
  return useQuery({
    queryKey: ['available-times', fieldId, selectedDate],
    queryFn: async () => {
      // Normaliser la date pour Supabase (YYYY-MM-DD) sans décalage timezone
      const normalizedDate = formatDateForSupabase(selectedDate);

      const { data, error } = await supabase
        .from('field_availability')
        .select('start_time, end_time, is_available')
        .eq('field_id', fieldId)
        .eq('date', normalizedDate)
        .eq('is_available', true)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Erreur chargement créneaux disponibles:', error);
        throw error;
      }

      const rows = data || [];

      // Extraire les heures de début uniques et normalisées
      const uniqueStartTimes = Array.from(
        new Set(rows.map(slot => normalizeTime(slot.start_time)))
      ).sort();

      // Récupérer la première heure disponible
      const firstAvailableTime = rows.length > 0 ? normalizeTime(rows[0].start_time) : null;

      console.log('🕒 Créneaux disponibles pour', normalizedDate, ':', uniqueStartTimes);
      console.log('🕒 Première heure disponible:', firstAvailableTime);

      return {
        slots: rows,
        availableStartTimes: uniqueStartTimes,
        firstAvailableTime
      };
    },
    enabled: !!fieldId && !!selectedDate
  });
};
