
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export const useExistingSlots = (fieldId: string, startDate: Date, endDate: Date) => {
  return useQuery({
    queryKey: ['existing-slots', fieldId, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('field_availability')
        .select('*')
        .eq('field_id', fieldId)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date')
        .order('start_time')
        .limit(10000);

      if (error) throw error;
      return data || [];
    },
    enabled: !!fieldId && !!startDate && !!endDate
  });
};
