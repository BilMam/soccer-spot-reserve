import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useCagnotte = () => {
  const queryClient = useQueryClient();

  const createCagnotte = useMutation({
    mutationFn: async (params: {
      fieldId: string;
      slotDate: string;
      slotStartTime: string;
      slotEndTime: string;
    }) => {
      const { data, error } = await supabase.rpc('create_cagnotte', {
        p_field_id: params.fieldId,
        p_slot_date: params.slotDate,
        p_slot_start_time: params.slotStartTime,
        p_slot_end_time: params.slotEndTime
      }) as { data: any; error: any };

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-availability'] });
    }
  });

  return { createCagnotte };
};
