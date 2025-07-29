
import { supabase } from '@/integrations/supabase/client';
import { parseTimeSlot } from '@/utils/timeSlotParser';
import { timeToMinutes, minutesToTime } from '@/utils/timeUtils';
import type { Field } from '@/types/search';

export const checkFieldAvailability = async (
  fields: Field[],
  date: string,
  timeSlot: string
): Promise<Field[]> => {
  const parsedTimeSlot = parseTimeSlot(timeSlot);
  console.log('🔍 Créneau parsé:', parsedTimeSlot);

  if (!parsedTimeSlot?.isValid) {
    return fields;
  }

  const availableFields = [];
  
  for (const field of fields) {
    console.log(`\n🔍 === VÉRIFICATION TERRAIN: ${field.name} ===`);
    
    // Générer tous les créneaux de 30 min requis
    const requiredSlots = generateRequiredSlots(parsedTimeSlot.startTime, parsedTimeSlot.endTime);
    console.log(`🔍 Créneaux requis:`, requiredSlots);

    // Vérifier la disponibilité de chaque créneau requis
    const isFieldAvailable = await checkSlotsAvailability(field, date, requiredSlots, parsedTimeSlot);
    
    console.log(`\n🔍 === DÉCISION FINALE pour ${field.name}: ${isFieldAvailable ? 'INCLUS' : 'EXCLU'} ===`);
    
    if (isFieldAvailable) {
      availableFields.push(field);
    }
  }

  console.log(`\n🔍 === RÉSULTAT FINAL ===`);
  console.log(`🔍 Terrains disponibles: ${availableFields.length}`);
  console.log(`🔍 Noms des terrains inclus:`, availableFields.map(f => f.name));
  
  return availableFields;
};

const generateRequiredSlots = (startTime: string, endTime: string) => {
  const requiredSlots = [];
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  console.log(`🔍 Période demandée: ${startTime} à ${endTime}`);
  console.log(`🔍 En minutes: ${startMinutes} à ${endMinutes}`);
  
  for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
    const slotStart = minutesToTime(minutes);
    const slotEnd = minutesToTime(minutes + 30);
    requiredSlots.push({ start: slotStart, end: slotEnd });
  }
  
  return requiredSlots;
};

const checkSlotsAvailability = async (
  field: Field,
  date: string,
  requiredSlots: Array<{ start: string; end: string }>,
  parsedTimeSlot: { startTime: string; endTime: string }
): Promise<boolean> => {
  let isFieldAvailable = true;
  const unavailableSlots = [];
  
  for (const slot of requiredSlots) {
    console.log(`\n🔍 → Vérification créneau ${slot.start}-${slot.end}`);
    
    // Récupérer le créneau spécifique
    const { data: availableSlot, error: slotError } = await supabase
      .from('field_availability')
      .select('*')
      .eq('field_id', field.id)
      .eq('date', date)
      .eq('start_time', slot.start + ':00')
      .eq('end_time', slot.end + ':00')
      .maybeSingle();

    if (slotError) {
      console.log(`🔍 ❌ ERREUR lors de la vérification:`, slotError);
      isFieldAvailable = false;
      unavailableSlots.push(`${slot.start}-${slot.end} (erreur)`);
      break;
    }

    if (!availableSlot) {
      console.log(`🔍 ❌ CRÉNEAU INEXISTANT: ${slot.start}-${slot.end}`);
      isFieldAvailable = false;
      unavailableSlots.push(`${slot.start}-${slot.end} (inexistant)`);
      break;
    }

    if (!availableSlot.is_available) {
      console.log(`🔍 ❌ CRÉNEAU INDISPONIBLE: ${slot.start}-${slot.end} (is_available: false)`);
      isFieldAvailable = false;
      unavailableSlots.push(`${slot.start}-${slot.end} (indisponible)`);
      break;
    }

    console.log(`🔍 ✅ CRÉNEAU OK: ${slot.start}-${slot.end}`);
  }

  // Afficher le résultat de la vérification des créneaux
  console.log(`\n🔍 RÉSULTAT CRÉNEAUX pour ${field.name}:`);
  console.log(`🔍 - Statut: ${isFieldAvailable ? 'DISPONIBLE' : 'INDISPONIBLE'}`);
  if (!isFieldAvailable) {
    console.log(`🔍 - Créneaux problématiques:`, unavailableSlots);
  }

  // Vérifier les conflits de réservation SEULEMENT si tous les créneaux sont disponibles
  if (isFieldAvailable) {
    console.log(`🔍 → Vérification des conflits de réservation...`);
    
    const { data: conflictingBookings } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('field_id', field.id)
      .eq('booking_date', date)
      .in('status', ['pending', 'confirmed', 'owner_confirmed'])
      .or(
        `and(start_time.lt.${parsedTimeSlot.endTime},end_time.gt.${parsedTimeSlot.startTime})`
      );

    if (conflictingBookings && conflictingBookings.length > 0) {
      console.log(`🔍 ❌ CONFLIT DE RÉSERVATION détecté:`, conflictingBookings);
      isFieldAvailable = false;
    } else {
      console.log(`🔍 ✅ Aucun conflit de réservation`);
    }
  }

  return isFieldAvailable;
};
