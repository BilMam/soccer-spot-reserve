import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateAvailabilityForRecurringSlot, removeGeneratedSlotsForRecurringSlot } from '@/utils/recurringSlotGenerator';

export interface RecurringSlot {
  id?: string;
  field_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date?: string | null;
  is_active?: boolean;
  label?: string | null;
  notes?: string | null;
  created_by?: string;
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

  // Créer un ou plusieurs créneaux récurrents
  const createRecurringSlot = useMutation({
    mutationFn: async ({ slotData, days }: { slotData: Omit<RecurringSlot, 'id'>; days: number[] }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      // Créer un créneau pour chaque jour sélectionné
      const slotsToCreate = days.map(day => ({
        ...slotData,
        day_of_week: day,
        created_by: userId
      }));

      const { data, error } = await supabase
        .from('recurring_slots')
        .insert(slotsToCreate)
        .select();

      if (error) throw error;
      
      // Générer les créneaux d'indisponibilité sur toute la période définie
      if (data && data.length > 0) {
        for (const slot of data) {
          await generateAvailabilityForRecurringSlot(slot as RecurringSlot);
        }
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-slots', fieldId] });
      queryClient.invalidateQueries({ queryKey: ['field-availability-period', fieldId] });
      const count = data?.length || 1;
      toast.success(`${count} créneau${count > 1 ? 'x' : ''} récurrent${count > 1 ? 's' : ''} créé${count > 1 ? 's' : ''} et bloqué${count > 1 ? 's' : ''} dans le calendrier`);
    },
    onError: (error) => {
      console.error('Erreur création créneau récurrent:', error);
      toast.error('Erreur lors de la création du créneau récurrent');
    }
  });

  // Mettre à jour un créneau récurrent
  const updateRecurringSlot = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecurringSlot> & { id: string }) => {
      // Récupérer le slot avant mise à jour pour supprimer les anciens créneaux générés
      const { data: oldSlot } = await supabase
        .from('recurring_slots')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('recurring_slots')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Supprimer les anciens créneaux générés et créer les nouveaux
      if (oldSlot) {
        await removeGeneratedSlotsForRecurringSlot(
          oldSlot.field_id,
          oldSlot.day_of_week,
          oldSlot.start_time,
          oldSlot.end_time,
          oldSlot.start_date
        );
      }
      
      if (data) {
        await generateAvailabilityForRecurringSlot(data as RecurringSlot);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-slots', fieldId] });
      queryClient.invalidateQueries({ queryKey: ['field-availability-period', fieldId] });
      toast.success('Créneau récurrent mis à jour et calendrier actualisé');
    },
    onError: (error) => {
      console.error('Erreur modification créneau récurrent:', error);
      toast.error('Erreur lors de la modification du créneau récurrent');
    }
  });

  // Supprimer un créneau récurrent
  const deleteRecurringSlot = useMutation({
    mutationFn: async (id: string) => {
      // Récupérer le slot avant suppression pour nettoyer les créneaux générés
      const { data: slot } = await supabase
        .from('recurring_slots')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('recurring_slots')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Supprimer les créneaux générés dans field_availability
      if (slot) {
        await removeGeneratedSlotsForRecurringSlot(
          slot.field_id,
          slot.day_of_week,
          slot.start_time,
          slot.end_time,
          slot.start_date
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-slots', fieldId] });
      queryClient.invalidateQueries({ queryKey: ['field-availability-period', fieldId] });
      toast.success('Créneau récurrent supprimé et calendrier actualisé');
    },
    onError: (error) => {
      console.error('Erreur suppression créneau récurrent:', error);
      toast.error('Erreur lors de la suppression du créneau récurrent');
    }
  });

  // Activer/Désactiver un créneau récurrent
  const toggleRecurringSlot = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      // Récupérer le slot
      const { data: slot } = await supabase
        .from('recurring_slots')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('recurring_slots')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
      
      if (slot) {
        if (is_active) {
          // Si on active, générer les créneaux d'indisponibilité sur toute la période
          await generateAvailabilityForRecurringSlot({ ...slot, is_active: true } as RecurringSlot);
        } else {
          // Si on désactive, supprimer les créneaux générés
          await removeGeneratedSlotsForRecurringSlot(
            slot.field_id,
            slot.day_of_week,
            slot.start_time,
            slot.end_time,
            slot.start_date
          );
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-slots', fieldId] });
      queryClient.invalidateQueries({ queryKey: ['field-availability-period', fieldId] });
      toast.success(variables.is_active ? 'Créneau activé et bloqué dans le calendrier' : 'Créneau désactivé et libéré dans le calendrier');
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
