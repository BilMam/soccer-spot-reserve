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
        .select('start_time, end_time, is_available, on_hold_until')
        .eq('field_id', fieldId)
        .eq('date', normalizedDate)
        .eq('is_available', true)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Erreur chargement créneaux disponibles:', error);
        throw error;
      }

      const rows = data || [];
      
      // Filtrer les slots en HOLD actif (masquer pour les autres utilisateurs)
      const now = new Date();
      const availableRows = rows.filter(slot => {
        if (slot.on_hold_until) {
          const holdUntil = new Date(slot.on_hold_until);
          if (holdUntil > now) {
            return false; // Slot en HOLD, on ne l'affiche pas
          }
        }
        return true;
      });

      // Extraire les heures de début uniques et normalisées
      const uniqueStartTimes = Array.from(
        new Set(availableRows.map(slot => normalizeTime(slot.start_time)))
      ).sort();

      // Récupérer la première heure disponible
      const firstAvailableTime = availableRows.length > 0 ? normalizeTime(availableRows[0].start_time) : null;

      console.log('🕒 Créneaux disponibles pour', normalizedDate, ':', uniqueStartTimes);
      console.log('🕒 Première heure disponible:', firstAvailableTime);

      return {
        slots: availableRows,
        availableStartTimes: uniqueStartTimes,
        firstAvailableTime
      };
    },
    enabled: !!fieldId && !!selectedDate
  });
};
