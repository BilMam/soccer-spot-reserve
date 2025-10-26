
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TimeExclusion {
  date: Date;
  startTime: string;
  endTime: string;
  reason?: string;
}

interface DaySpecificTime {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export const useSlotOperations = (fieldId: string) => {
  const queryClient = useQueryClient();

  // Vérifier si un créneau est réservé
  const checkSlotBookingStatus = async (date: string, startTime: string, endTime: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('check_slot_booking_status', {
      p_field_id: fieldId,
      p_date: date,
      p_start_time: startTime,
      p_end_time: endTime
    });

    if (error) {
      console.error('Erreur vérification réservation:', error);
      return false;
    }

    return data || false;
  };

  // Créer des créneaux pour une période avec exclusions
  const createAvailabilityForPeriod = useMutation({
    mutationFn: async (params: {
      startDate: string;
      endDate: string;
      startTime: string;
      endTime: string;
      slotDuration?: number;
      excludeDays?: number[];
      templateId?: string;
      timeExclusions?: TimeExclusion[];
      daySpecificTimes?: DaySpecificTime[];
    }) => {
      // D'abord créer tous les créneaux de base
      // Note: p_day_specific_times sera utilisé quand le backend sera mis à jour
      const rpcParams: any = {
        p_field_id: fieldId,
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_start_time: params.startTime,
        p_end_time: params.endTime,
        p_slot_duration: params.slotDuration || 30,
        p_exclude_days: params.excludeDays || [],
        p_template_id: params.templateId
      };
      
      // Ajouter daySpecificTimes si supporté par le backend
      if (params.daySpecificTimes && params.daySpecificTimes.length > 0) {
        rpcParams.p_day_specific_times = JSON.stringify(params.daySpecificTimes);
      }
      
      const { data, error } = await supabase.rpc('create_availability_for_period', rpcParams);

      if (error) throw error;

      // Ensuite appliquer les exclusions horaires spécifiques
      if (params.timeExclusions && params.timeExclusions.length > 0) {
        for (const exclusion of params.timeExclusions) {
          const dateStr = exclusion.date.toISOString().split('T')[0];
          
          const { error: exclusionError } = await supabase.rpc('set_slots_unavailable', {
            p_field_id: fieldId,
            p_date: dateStr,
            p_start_time: exclusion.startTime,
            p_end_time: exclusion.endTime,
            p_reason: exclusion.reason || 'Exclusion programmée',
            p_notes: exclusion.reason
          });

          if (exclusionError) {
            console.error('Erreur exclusion:', exclusionError);
          }
        }
      }

      return data;
    },
    onSuccess: (slotsCreated) => {
      // Invalider toutes les requêtes liées aux créneaux pour forcer le rafraîchissement
      queryClient.invalidateQueries({ queryKey: ['field-availability-period', fieldId] });
      toast.success(`Créneaux créés avec succès (${slotsCreated} créneaux de base + exclusions appliquées)`);
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
        p_reason: params.reason || 'Indisponible',
        p_notes: params.notes
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (affectedCount) => {
      // Invalider toutes les requêtes liées aux créneaux
      queryClient.invalidateQueries({ queryKey: ['field-availability-period', fieldId] });
      toast.success(`${affectedCount} créneaux marqués comme indisponibles`);
    },
    onError: (error) => {
      console.error('Erreur modification créneaux:', error);
      
      // Vérifier si l'erreur est due à un conflit de réservation
      if (error.message && error.message.includes('active booking')) {
        toast.error('Impossible de marquer indisponible : des réservations actives existent pour cette période');
      } else {
        toast.error('Erreur lors de la modification des créneaux');
      }
    }
  });

  // Marquer des créneaux comme disponibles
  const setSlotsAvailable = useMutation({
    mutationFn: async (params: {
      date: string;
      startTime: string;
      endTime: string;
    }) => {
      const { data, error } = await supabase
        .from('field_availability')
        .update({
          is_available: true,
          unavailability_reason: null,
          notes: null,
          is_maintenance: false,
          updated_at: new Date().toISOString()
        })
        .eq('field_id', fieldId)
        .eq('date', params.date)
        .gte('start_time', params.startTime)
        .lte('start_time', params.endTime);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-availability-period', fieldId] });
      toast.success('Créneaux marqués comme disponibles');
    },
    onError: (error) => {
      console.error('Erreur modification créneaux:', error);
      toast.error('Erreur lors de la modification des créneaux');
    }
  });

  return {
    createAvailabilityForPeriod,
    setSlotsUnavailable,
    setSlotsAvailable,
    checkSlotBookingStatus
  };
};
