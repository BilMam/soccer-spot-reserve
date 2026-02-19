
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useFieldAvailability = (fieldId: string) => {
  // Récupérer les créneaux pour une période
  const useFieldAvailabilityForPeriod = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['field-availability-period', fieldId, startDate, endDate],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('field_availability')
          .select('*, on_hold_until, hold_cagnotte_id')
          .eq('field_id', fieldId)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(10000);

        if (error) throw error;
        return data;
      },
      enabled: !!fieldId && !!startDate && !!endDate
    });
  };

  return {
    useFieldAvailabilityForPeriod
  };
};
