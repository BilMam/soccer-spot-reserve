import { supabase } from '@/integrations/supabase/client';

/**
 * Vérifie si une plage horaire chevauche un créneau récurrent
 */
export const checkRecurringSlotOverlap = async (
  fieldId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<boolean> => {
  try {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay(); // 0 = dimanche, 6 = samedi

    // Récupérer tous les créneaux récurrents actifs pour ce jour
    const { data: recurringSlots, error } = await supabase
      .from('recurring_slots' as any)
      .select('*')
      .eq('field_id', fieldId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .lte('start_date', date)
      .or(`end_date.is.null,end_date.gte.${date}`);

    if (error) {
      console.error('Erreur lors de la vérification des créneaux récurrents:', error);
      return false;
    }

    if (!recurringSlots || recurringSlots.length === 0) {
      return false;
    }

    // Vérifier si la plage horaire demandée chevauche un créneau récurrent
    for (const slot of recurringSlots as any[]) {
      const slotStart = slot.start_time;
      const slotEnd = slot.end_time;

      // Chevauchement : la plage demandée commence avant la fin du slot ET se termine après le début du slot
      if (startTime < slotEnd && endTime > slotStart) {
        console.log('🔴 Chevauchement détecté avec créneau récurrent:', {
          date,
          requestedRange: `${startTime} - ${endTime}`,
          recurringSlot: `${slotStart} - ${slotEnd}`,
          label: slot.label
        });
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Erreur lors de la vérification des créneaux récurrents:', error);
    return false;
  }
};

/**
 * Récupère tous les créneaux récurrents actifs pour une période donnée
 */
export const getRecurringSlotsForPeriod = async (
  fieldId: string,
  startDate: string,
  endDate: string
) => {
  try {
    const { data, error } = await supabase
      .from('recurring_slots' as any)
      .select('*')
      .eq('field_id', fieldId)
      .eq('is_active', true)
      .or(`end_date.is.null,end_date.gte.${startDate}`)
      .lte('start_date', endDate);

    if (error) throw error;
    return (data || []) as any[];
  } catch (error) {
    console.error('Erreur lors de la récupération des créneaux récurrents:', error);
    return [];
  }
};

/**
 * Vérifie si un créneau donné chevauche un créneau récurrent pour une date spécifique
 */
export const isSlotInRecurringRange = (
  recurringSlots: any[],
  date: string,
  slotStartTime: string,
  slotEndTime: string
): { isRecurring: boolean; recurringLabel?: string } => {
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();

  for (const slot of recurringSlots) {
    // Vérifier si ce slot s'applique à ce jour de la semaine
    if (slot.day_of_week !== dayOfWeek) {
      continue;
    }

    // Vérifier si la date est dans la période de validité
    if (date < slot.start_date) {
      continue;
    }
    if (slot.end_date && date > slot.end_date) {
      continue;
    }

    // Vérifier le chevauchement horaire
    // Chevauchement si : slotStart < recurringEnd ET slotEnd > recurringStart
    if (slotStartTime < slot.end_time && slotEndTime > slot.start_time) {
      return {
        isRecurring: true,
        recurringLabel: slot.label || 'Créneau récurrent'
      };
    }
  }

  return { isRecurring: false };
};

/**
 * Génère les créneaux bloqués par les récurrences pour une date spécifique
 * @deprecated Utiliser isSlotInRecurringRange pour marquer les créneaux existants
 */
export const generateBlockedSlotsForDate = (
  recurringSlots: any[],
  date: string
): Array<{ start_time: string; end_time: string; reason: string }> => {
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  const blockedSlots: Array<{ start_time: string; end_time: string; reason: string }> = [];

  recurringSlots.forEach(slot => {
    // Vérifier si ce slot s'applique à ce jour de la semaine
    if (slot.day_of_week !== dayOfWeek) {
      return;
    }

    // Vérifier si la date est dans la période de validité
    if (date < slot.start_date) {
      return;
    }
    if (slot.end_date && date > slot.end_date) {
      return;
    }

    // Découper le créneau récurrent en tranches de 30 minutes
    const startMinutes = parseInt(slot.start_time.split(':')[0]) * 60 + parseInt(slot.start_time.split(':')[1]);
    const endMinutes = parseInt(slot.end_time.split(':')[0]) * 60 + parseInt(slot.end_time.split(':')[1]);

    let currentMinutes = startMinutes;
    while (currentMinutes < endMinutes) {
      const nextMinutes = currentMinutes + 30;
      const startTime = `${String(Math.floor(currentMinutes / 60)).padStart(2, '0')}:${String(currentMinutes % 60).padStart(2, '0')}:00`;
      const endTime = `${String(Math.floor(nextMinutes / 60)).padStart(2, '0')}:${String(nextMinutes % 60).padStart(2, '0')}:00`;

      blockedSlots.push({
        start_time: startTime,
        end_time: endTime,
        reason: slot.label || 'Créneau récurrent'
      });

      currentMinutes = nextMinutes;
    }
  });

  return blockedSlots;
};
