
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PeriodTemplate {
  id?: string;
  field_id: string;
  template_name: string;
  start_date: string;
  end_date: string;
  default_start_time: string;
  default_end_time: string;
  apply_pattern: 'all_days' | 'weekdays' | 'weekends' | 'custom';
  excluded_days: number[];
}

export const usePeriodTemplates = (fieldId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les templates de période
  const usePeriodTemplates = () => {
    return useQuery({
      queryKey: ['period-templates', fieldId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('availability_period_templates')
          .select('*')
          .eq('field_id', fieldId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
      },
      enabled: !!fieldId
    });
  };

  // Sauvegarder un template de période
  const savePeriodTemplate = useMutation({
    mutationFn: async (template: PeriodTemplate) => {
      const { data, error } = await supabase
        .from('availability_period_templates')
        .insert({
          ...template,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-templates'] });
      toast.success('Template sauvegardé avec succès');
    },
    onError: (error) => {
      console.error('Erreur sauvegarde template:', error);
      toast.error('Erreur lors de la sauvegarde du template');
    }
  });

  return {
    usePeriodTemplates,
    savePeriodTemplate
  };
};
