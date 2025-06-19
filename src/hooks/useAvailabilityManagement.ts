
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

interface AvailabilitySlot {
  id?: string;
  field_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  unavailability_reason?: string;
  is_maintenance?: boolean;
  notes?: string;
}

export const useAvailabilityManagement = (fieldId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les créneaux pour une période
  const useFieldAvailabilityForPeriod = (startDate: string, endDate: string) => {
    return useQuery({
      queryKey: ['field-availability-period', fieldId, startDate, endDate],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('field_availability')
          .select('*')
          .eq('field_id', fieldId)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) throw error;
        return data;
      },
      enabled: !!fieldId && !!startDate && !!endDate
    });
  };

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

  // Créer des créneaux pour une période
  const createAvailabilityForPeriod = useMutation({
    mutationFn: async (params: {
      startDate: string;
      endDate: string;
      startTime: string;
      endTime: string;
      slotDuration?: number;
      excludeDays?: number[];
      templateId?: string;
    }) => {
      const { data, error } = await supabase.rpc('create_availability_for_period', {
        p_field_id: fieldId,
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_start_time: params.startTime,
        p_end_time: params.endTime,
        p_slot_duration: params.slotDuration || 30,
        p_exclude_days: params.excludeDays || [],
        p_template_id: params.templateId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (slotsCreated) => {
      queryClient.invalidateQueries({ queryKey: ['field-availability-period'] });
      toast.success(`${slotsCreated} créneaux créés avec succès`);
    },
    onError: (error) => {
      console.error('Erreur création créneaux:', error);
      toast.error('Erreur lors de la création des créneaux');
    }
  });

  // Marquer des créneaux comme indisponibles
  const setSlotsUnavailable = useMutation({
    mutationFn: async (params: {
      date: string;
      startTime: string;
      endTime: string;
      reason?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('set_slots_unavailable', {
        p_field_id: fieldId,
        p_date: params.date,
        p_start_time: params.startTime,
        p_end_time: params.endTime,
        p_reason: params.reason || 'Maintenance',
        p_notes: params.notes
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (affectedCount) => {
      queryClient.invalidateQueries({ queryKey: ['field-availability-period'] });
      toast.success(`${affectedCount} créneaux marqués comme indisponibles`);
    },
    onError: (error) => {
      console.error('Erreur modification créneaux:', error);
      toast.error('Erreur lors de la modification des créneaux');
    }
  });

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
    useFieldAvailabilityForPeriod,
    usePeriodTemplates,
    createAvailabilityForPeriod,
    setSlotsUnavailable,
    savePeriodTemplate
  };
};
