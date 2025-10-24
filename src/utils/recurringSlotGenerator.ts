import { supabase } from '@/integrations/supabase/client';
import { addDays, format, isBefore, parseISO, startOfDay } from 'date-fns';
import { RecurringSlot } from '@/hooks/useRecurringSlots';

/**
 * Génère des créneaux d'indisponibilité dans field_availability pour un créneau récurrent
 * sur TOUTE sa période de validité (start_date → end_date)
 */
export const generateAvailabilityForRecurringSlot = async (
  slot: RecurringSlot
): Promise<number> => {
  if (!slot.is_active) return 0;

  const slotStartDate = startOfDay(parseISO(slot.start_date));
  
  // Si pas de date de fin, on génère jusqu'à 2 ans dans le futur
  // (car il faut bien une limite pour éviter une boucle infinie)
  const defaultEndDate = addDays(new Date(), 730); // 2 ans
  const slotEndDate = slot.end_date 
    ? startOfDay(parseISO(slot.end_date)) 
    : defaultEndDate;
  
  let currentDate = slotStartDate;
  const slotsToInsert = [];

  // Parcourir chaque jour de la période
  while (isBefore(currentDate, slotEndDate) || currentDate.getTime() === slotEndDate.getTime()) {
    const dayOfWeek = currentDate.getDay();
    
    // Si le jour correspond au jour de la semaine du créneau récurrent
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
