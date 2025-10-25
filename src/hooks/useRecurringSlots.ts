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
  end_date?: string;
  label?: string;
  notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export const useRecurringSlots = (fieldId: string) => {
  const queryClient = useQueryClient();

  // Récupérer tous les créneaux récurrents d'un terrain
  const { data: recurringSlots = [], isLoading, refetch } = useQuery({
    queryKey: ['recurring-slots', fieldId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_slots' as any)
        .select('*')
        .eq('field_id', fieldId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as RecurringSlot[];
    },
    enabled: !!fieldId
  });

  // Créer un créneau récurrent
  const createRecurringSlot = useMutation({
    mutationFn: async (slot: Omit<RecurringSlot, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('recurring_slots' as any)
        .insert([slot as any])
        .select()
        .single();

      if (error) throw error;
      return data as unknown as RecurringSlot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-slots', fieldId] });
      queryClient.invalidateQueries({ queryKey: ['field-availability-period', fieldId] });
      toast.success('Créneau récurrent créé avec succès');
    },
    onError: (error) => {
      console.error('Erreur lors de la création du créneau récurrent:', error);
      toast.error('Erreur lors de la création du créneau récurrent');
    }
  });

  // Mettre à jour un créneau récurrent
  const updateRecurringSlot = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecurringSlot> & { id: string }) => {
      const { data, error } = await supabase
        .from('recurring_slots' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as RecurringSlot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-slots', fieldId] });
      queryClient.invalidateQueries({ queryKey: ['field-availability-period', fieldId] });
      toast.success('Créneau récurrent mis à jour');
    },
    onError: (error) => {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  });

  // Supprimer un créneau récurrent
  const deleteRecurringSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_slots' as any)
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
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  });

  // Activer/désactiver un créneau récurrent
  const toggleRecurringSlot = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('recurring_slots' as any)
        .update({ is_active } as any)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-slots', fieldId] });
      queryClient.invalidateQueries({ queryKey: ['field-availability-period', fieldId] });
    },
    onError: (error) => {
      console.error('Erreur lors du changement de statut:', error);
      toast.error('Erreur lors du changement de statut');
    }
  });

  return {
    recurringSlots,
    isLoading,
    refetch,
    createRecurringSlot,
    updateRecurringSlot,
    deleteRecurringSlot,
    toggleRecurringSlot
  };
};
