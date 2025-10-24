import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RecurringSlot {
  id?: string;
  field_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date?: string | null;
  is_active?: boolean;
  label?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export const useRecurringSlots = (fieldId: string) => {
  const queryClient = useQueryClient();

  // Récupérer tous les créneaux récurrents d'un terrain
  const useRecurringSlotsQuery = () => {
    return useQuery({
      queryKey: ['recurring-slots', fieldId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('recurring_slots')
          .select('*')
          .eq('field_id', fieldId)
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) throw error;
        return data as RecurringSlot[];
      },
      enabled: !!fieldId
    });
  };

  // Créer un nouveau créneau récurrent
  const createRecurringSlot = useMutation({
    mutationFn: async (slot: Omit<RecurringSlot, 'id'>) => {
      const { data, error } = await supabase
        .from('recurring_slots')
        .insert({
          ...slot,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-slots', fieldId] });
      queryClient.invalidateQueries({ queryKey: ['field-availability-period', fieldId] });
      toast.success('Créneau récurrent créé avec succès');
    },
    onError: (error) => {
      console.error('Erreur création créneau récurrent:', error);
      toast.error('Erreur lors de la création du créneau récurrent');
    }
  });

  // Mettre à jour un créneau récurrent
  const updateRecurringSlot = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecurringSlot> & { id: string }) => {
      const { data, error } = await supabase
        .from('recurring_slots')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-slots', fieldId] });
      queryClient.invalidateQueries({ queryKey: ['field-availability-period', fieldId] });
      toast.success('Créneau récurrent mis à jour');
    },
    onError: (error) => {
      console.error('Erreur modification créneau récurrent:', error);
      toast.error('Erreur lors de la modification du créneau récurrent');
    }
  });

  // Supprimer un créneau récurrent
  const deleteRecurringSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_slots')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-slots', fieldId] });
      queryClient.invalidateQueries({ queryKey: ['field-availability-period', fieldId] });
      toast.success('Créneau récurrent supprimé');
    },
    onError: (error) => {
      console.error('Erreur suppression créneau récurrent:', error);
      toast.error('Erreur lors de la suppression du créneau récurrent');
    }
  });

  // Activer/Désactiver un créneau récurrent
  const toggleRecurringSlot = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('recurring_slots')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-slots', fieldId] });
      queryClient.invalidateQueries({ queryKey: ['field-availability-period', fieldId] });
      toast.success(variables.is_active ? 'Créneau activé' : 'Créneau désactivé');
    },
    onError: (error) => {
      console.error('Erreur activation/désactivation:', error);
      toast.error('Erreur lors de la modification du statut');
    }
  });

  return {
    useRecurringSlotsQuery,
    createRecurringSlot,
    updateRecurringSlot,
    deleteRecurringSlot,
    toggleRecurringSlot
  };
};
