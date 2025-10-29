import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizeTime } from '@/utils/timeUtils';

export const useAvailableTimesForDate = (fieldId: string, selectedDate: string) => {
  return useQuery({
    queryKey: ['available-times', fieldId, selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('field_availability')
        .select('start_time, end_time, is_available')
        .eq('field_id', fieldId)
        .eq('date', selectedDate)
        .eq('is_available', true)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Erreur chargement créneaux disponibles:', error);
        throw error;
      }

      // Extraire les heures de début uniques et normalisées
      const uniqueStartTimes = Array.from(
        new Set((data || []).map(slot => normalizeTime(slot.start_time)))
      ).sort();

      console.log('🕒 Créneaux disponibles pour', selectedDate, ':', uniqueStartTimes);

      return {
        slots: data || [],
        availableStartTimes: uniqueStartTimes
      };
    },
    enabled: !!fieldId && !!selectedDate
  });
};
