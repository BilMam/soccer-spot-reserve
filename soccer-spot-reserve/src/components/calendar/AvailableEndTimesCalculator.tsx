
import { timeToMinutes, minutesToTime } from '@/utils/timeUtils';
import { SlotStatusUtils } from './SlotStatusUtils';

export class AvailableEndTimesCalculator {
  private slotStatusUtils: SlotStatusUtils;

  constructor(slotStatusUtils: SlotStatusUtils) {
    this.slotStatusUtils = slotStatusUtils;
  }

  // CORRIGÉ: Utilise maintenant la détection de chevauchements
  getAvailableEndTimes(startTime: string): string[] {
    if (!startTime) return [];
    const startMinutes = timeToMinutes(startTime);
    const availableEndTimes: string[] = [];

    console.log('🔍 getAvailableEndTimes - Recherche depuis:', startTime);

    for (let minutes = startMinutes + 30; minutes <= timeToMinutes('22:00'); minutes += 30) {
      const currentSlotStart = minutesToTime(minutes - 30);
      const currentSlotEnd = minutesToTime(minutes);
      const endTime = minutesToTime(minutes);
      
      const status = this.slotStatusUtils.getSlotStatus(currentSlotStart, currentSlotEnd);
      console.log('🔍 Vérification créneau:', `${currentSlotStart}-${currentSlotEnd}`, 'status:', status);
      
      if (status === 'available') {
        availableEndTimes.push(endTime);
        console.log('🔍 Ajouté heure de fin possible:', endTime);
      } else {
        // ARRÊTER dès qu'on trouve un créneau non disponible
        console.log('🔍 Arrêt à cause du créneau non disponible:', `${currentSlotStart}-${currentSlotEnd}`, 'status:', status);
        break;
      }
    }
    
    console.log('🔍 Heures de fin disponibles finales:', availableEndTimes);
    return availableEndTimes;
  }

  // MISE À JOUR: Cette fonction utilise maintenant la détection de chevauchements
  isRangeAvailable(startTime: string, endTime: string): boolean {
    if (!startTime || !endTime) return false;
    
    console.log('🔍 isRangeAvailable - Vérification plage:', `${startTime}-${endTime}`);

    // Utiliser la nouvelle méthode de détection de chevauchements
    if (this.slotStatusUtils.isRangeOverlapping(startTime, endTime)) {
      console.log('🔍 Plage NON disponible à cause d\'un chevauchement');
      return false;
    }

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const slotStartTime = minutesToTime(minutes);
      const slotEndTime = minutesToTime(minutes + 30);
      const status = this.slotStatusUtils.getSlotStatus(slotStartTime, slotEndTime);
      
      console.log('🔍 Vérification sous-créneau:', `${slotStartTime}-${slotEndTime}`, 'status:', status);
      
      if (status !== 'available') {
        console.log('🔍 Plage NON disponible à cause de:', `${slotStartTime}-${slotEndTime}`);
        return false;
      }
    }
    
    console.log('🔍 Plage ENTIÈREMENT disponible:', `${startTime}-${endTime}`);
    return true;
  }
}
