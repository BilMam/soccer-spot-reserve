
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { generateTimeOptions, timeToMinutes, minutesToTime, normalizeTime } from '@/utils/timeUtils';
import { supabase } from '@/integrations/supabase/client';

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  price_override?: number;
  unavailability_reason?: string;
  is_maintenance?: boolean;
  notes?: string;
}

interface TimeSlotSelectorProps {
  selectedStartTime: string;
  selectedEndTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  availableSlots: AvailabilitySlot[];
  fieldId: string;
}

const TimeSlotSelector: React.FC<TimeSlotSelectorProps> = ({
  selectedStartTime,
  selectedEndTime,
  onStartTimeChange,
  onEndTimeChange,
  availableSlots,
  fieldId
}) => {
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const timeOptions = generateTimeOptions();

  console.log('🔍 TimeSlotSelector - Field ID reçu:', fieldId);
  console.log('🔍 TimeSlotSelector - Créneaux disponibles:', availableSlots.length);

  // Récupérer les créneaux réservés
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (availableSlots.length === 0 || !fieldId) {
        console.log('🔍 Pas de créneaux ou pas de fieldId, skip fetch');
        return;
      }
      
      const dateStr = availableSlots[0]?.date;
      if (!dateStr) {
        console.log('🔍 Pas de date trouvée dans les créneaux');
        return;
      }

      console.log('🔍 Vérification réservations pour:', { fieldId, dateStr });

      try {
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('start_time, end_time')
          .eq('field_id', fieldId)
          .eq('booking_date', dateStr)
          .in('status', ['pending', 'confirmed', 'owner_confirmed']);

        if (error) {
          console.error('Erreur lors de la vérification des réservations:', error);
          return;
        }

        const bookedSlotKeys = new Set(
          bookings?.map(booking => {
            const normalizedStart = normalizeTime(booking.start_time);
            const normalizedEnd = normalizeTime(booking.end_time);
            const slotKey = `${normalizedStart}-${normalizedEnd}`;
            console.log('🔍 Slot réservé normalisé:', slotKey, 'depuis:', booking.start_time, booking.end_time);
            return slotKey;
          }) || []
        );
        
        console.log('🔍 Créneaux réservés récupérés:', Array.from(bookedSlotKeys));
        setBookedSlots(bookedSlotKeys);
      } catch (error) {
        console.error('Erreur lors de la vérification des réservations:', error);
      }
    };

    fetchBookedSlots();
  }, [availableSlots, fieldId]);

  // Vérifier si un créneau spécifique est réservé
  const isSlotBooked = (startTime: string, endTime: string): boolean => {
    const normalizedStart = normalizeTime(startTime);
    const normalizedEnd = normalizeTime(endTime);
    const slotKey = `${normalizedStart}-${normalizedEnd}`;
    const isBooked = bookedSlots.has(slotKey);
    console.log('🔍 Vérification réservation:', slotKey, 'isBooked:', isBooked);
    return isBooked;
  };

  // Vérifier si un créneau est disponible (existe et is_available = true)
  const isSlotAvailable = (startTime: string, endTime: string): boolean => {
    const normalizedStart = normalizeTime(startTime);
    const normalizedEnd = normalizeTime(endTime);
    
    const slot = availableSlots.find(s => {
      const slotNormalizedStart = normalizeTime(s.start_time);
      const slotNormalizedEnd = normalizeTime(s.end_time);
      return slotNormalizedStart === normalizedStart && slotNormalizedEnd === normalizedEnd;
    });
    
    const available = slot ? slot.is_available : false;
    console.log('🔍 isSlotAvailable:', `${normalizedStart}-${normalizedEnd}`, 'available:', available);
    return available;
  };

  // Déterminer le statut d'un créneau
  const getSlotStatus = (startTime: string, endTime: string): 'available' | 'booked' | 'unavailable' | 'not_created' => {
    const normalizedStart = normalizeTime(startTime);
    const normalizedEnd = normalizeTime(endTime);
    
    const slot = availableSlots.find(s => {
      const slotNormalizedStart = normalizeTime(s.start_time);
      const slotNormalizedEnd = normalizeTime(s.end_time);
      return slotNormalizedStart === normalizedStart && slotNormalizedEnd === normalizedEnd;
    });
    
    if (!slot) {
      console.log('🔍 getSlotStatus: not_created pour', `${normalizedStart}-${normalizedEnd}`);
      return 'not_created';
    }
    
    if (isSlotBooked(startTime, endTime)) {
      console.log('🔍 getSlotStatus: booked pour', `${normalizedStart}-${normalizedEnd}`);
      return 'booked';
    }
    
    if (!slot.is_available) {
      console.log('🔍 getSlotStatus: unavailable pour', `${normalizedStart}-${normalizedEnd}`);
      return 'unavailable';
    }
    
    console.log('🔍 getSlotStatus: available pour', `${normalizedStart}-${normalizedEnd}`);
    return 'available';
  };

  // CORRIGÉ: Cette fonction s'arrête maintenant dès qu'un créneau non disponible est trouvé
  const getAvailableEndTimes = (startTime: string): string[] => {
    if (!startTime) return [];
    const startMinutes = timeToMinutes(startTime);
    const availableEndTimes: string[] = [];

    console.log('🔍 getAvailableEndTimes - Recherche depuis:', startTime);

    for (let minutes = startMinutes + 30; minutes <= timeToMinutes('22:00'); minutes += 30) {
      const currentSlotStart = minutesToTime(minutes - 30);
      const currentSlotEnd = minutesToTime(minutes);
      const endTime = minutesToTime(minutes);
      
      const status = getSlotStatus(currentSlotStart, currentSlotEnd);
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
  };

  // Cette fonction vérifie si toute une plage est disponible
  const isRangeAvailable = (startTime: string, endTime: string): boolean => {
    if (!startTime || !endTime) return false;
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    console.log('🔍 isRangeAvailable - Vérification plage:', `${startTime}-${endTime}`);

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const slotStartTime = minutesToTime(minutes);
      const slotEndTime = minutesToTime(minutes + 30);
      const status = getSlotStatus(slotStartTime, slotEndTime);
      
      console.log('🔍 Vérification sous-créneau:', `${slotStartTime}-${slotEndTime}`, 'status:', status);
      
      if (status !== 'available') {
        console.log('🔍 Plage NON disponible à cause de:', `${slotStartTime}-${slotEndTime}`);
        return false;
      }
    }
    
    console.log('🔍 Plage ENTIÈREMENT disponible:', `${startTime}-${endTime}`);
    return true;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'booked':
        return (
          <Badge variant="secondary" className="ml-2 text-xs bg-blue-100 text-blue-700">
            Réservé
          </Badge>
        );
      case 'unavailable':
        return (
          <Badge variant="secondary" className="ml-2 text-xs bg-red-100 text-red-700">
            Indisponible
          </Badge>
        );
      case 'not_created':
        return (
          <Badge variant="secondary" className="ml-2 text-xs bg-gray-100 text-gray-600">
            Pas de créneau
          </Badge>
        );
      default:
        return null;
    }
  };

  const availableEndTimes = getAvailableEndTimes(selectedStartTime);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Heure de début
        </label>
        <Select value={selectedStartTime} onValueChange={onStartTimeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir l'heure" />
          </SelectTrigger>
          <SelectContent>
            {timeOptions.slice(0, -1).map(time => {
              const nextTime = minutesToTime(timeToMinutes(time) + 30);
              const status = getSlotStatus(time, nextTime);
              const isDisabled = status !== 'available';
              
              return (
                <SelectItem key={time} value={time} disabled={isDisabled} className="flex items-center justify-between">
                  <div className="flex items-center justify-between w-full">
                    <span>{time}</span>
                    {getStatusBadge(status)}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Heure de fin
        </label>
        <Select value={selectedEndTime} onValueChange={onEndTimeChange} disabled={!selectedStartTime}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir l'heure" />
          </SelectTrigger>
          <SelectContent>
            {availableEndTimes.map(time => (
              <SelectItem key={time} value={time}>
                {time}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default TimeSlotSelector;
