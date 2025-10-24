import { supabase } from '@/integrations/supabase/client';
import { addDays, format, isBefore, isAfter, parseISO } from 'date-fns';
import { RecurringSlot } from '@/hooks/useRecurringSlots';

/**
 * Génère des créneaux d'indisponibilité dans field_availability pour les créneaux récurrents
 * pour les N prochains mois
 */
export const generateAvailabilityForRecurringSlots = async (
  fieldId: string,
  recurringSlots: RecurringSlot[],
  monthsAhead: number = 6
): Promise<number> => {
  const today = new Date();
  const endDate = addDays(today, monthsAhead * 30);
  
  let totalCreated = 0;

  for (const slot of recurringSlots) {
    if (!slot.is_active) continue;

    const slotStartDate = parseISO(slot.start_date);
    const slotEndDate = slot.end_date ? parseISO(slot.end_date) : endDate;
    
    // Commencer à partir d'aujourd'hui ou de la date de début du slot, selon ce qui est le plus tardif
    let currentDate = isBefore(slotStartDate, today) ? today : slotStartDate;
    
    const slotsToInsert = [];

    // Parcourir chaque jour jusqu'à la date de fin
    while (isBefore(currentDate, slotEndDate) && isBefore(currentDate, endDate)) {
      const dayOfWeek = currentDate.getDay();
      
      // Si le jour correspond au jour de la semaine du créneau récurrent
      if (dayOfWeek === slot.day_of_week) {
        slotsToInsert.push({
          field_id: fieldId,
          date: format(currentDate, 'yyyy-MM-dd'),
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_available: false,
          unavailability_reason: 'Créneau récurrent',
          notes: slot.notes || `Récurrence: ${slot.label || 'Sans nom'}`,
          created_by: slot.created_by
        });
      }
      
      currentDate = addDays(currentDate, 1);
    }

    // Insérer par lots pour éviter les problèmes de performance
    if (slotsToInsert.length > 0) {
      // Utiliser upsert pour éviter les doublons
      const { error } = await supabase
        .from('field_availability')
        .upsert(slotsToInsert, {
          onConflict: 'field_id,date,start_time,end_time',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Erreur génération créneaux récurrents:', error);
      } else {
        totalCreated += slotsToInsert.length;
      }
    }
  }

  return totalCreated;
};

/**
 * Génère les créneaux pour un seul slot récurrent
 */
export const generateAvailabilityForSingleRecurringSlot = async (
  slot: RecurringSlot,
  monthsAhead: number = 6
): Promise<number> => {
  if (!slot.is_active) return 0;

  const today = new Date();
  const endDate = addDays(today, monthsAhead * 30);
  
  const slotStartDate = parseISO(slot.start_date);
  const slotEndDate = slot.end_date ? parseISO(slot.end_date) : endDate;
  
  let currentDate = isBefore(slotStartDate, today) ? today : slotStartDate;
  
  const slotsToInsert = [];

  while (isBefore(currentDate, slotEndDate) && isBefore(currentDate, endDate)) {
    const dayOfWeek = currentDate.getDay();
    
    if (dayOfWeek === slot.day_of_week) {
      slotsToInsert.push({
        field_id: slot.field_id,
        date: format(currentDate, 'yyyy-MM-dd'),
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: false,
        unavailability_reason: 'Créneau récurrent',
        notes: slot.notes || `Récurrence: ${slot.label || 'Sans nom'}`,
        created_by: slot.created_by
      });
    }
    
    currentDate = addDays(currentDate, 1);
  }

  if (slotsToInsert.length > 0) {
    const { error } = await supabase
      .from('field_availability')
      .upsert(slotsToInsert, {
        onConflict: 'field_id,date,start_time,end_time',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Erreur génération créneaux récurrents:', error);
      return 0;
    }
    
    return slotsToInsert.length;
  }

  return 0;
};

/**
 * Supprime les créneaux générés pour un slot récurrent spécifique
 */
export const removeGeneratedSlotsForRecurringSlot = async (
  fieldId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  startDate: string
): Promise<void> => {
  const { error } = await supabase
    .from('field_availability')
    .delete()
    .eq('field_id', fieldId)
    .eq('start_time', startTime)
    .eq('end_time', endTime)
    .eq('unavailability_reason', 'Créneau récurrent')
    .gte('date', startDate);

  if (error) {
    console.error('Erreur suppression créneaux récurrents:', error);
  }
};
