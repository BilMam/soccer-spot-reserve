import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Euro, AlertCircle } from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
  price: number;
}
interface FieldCalendarProps {
  fieldId: string;
  fieldPrice: number;
  onTimeSlotSelect: (date: Date, startTime: string, endTime: string, price: number) => void;
}
const FieldCalendar: React.FC<FieldCalendarProps> = ({
  fieldId,
  fieldPrice,
  onTimeSlotSelect
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');

  // Générer les heures disponibles avec intervalles de 30 minutes (8h-22h)
  const generateTimeOptions = (): string[] => {
    const times: string[] = [];
    for (let hour = 8; hour <= 22; hour++) {
      times.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 22) {
        // Ne pas ajouter 22:30 car c'est après l'heure de fermeture
        times.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return times;
  };

  // Générer les créneaux par défaut avec intervalles de 30 minutes
  const generateDefaultTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = 8; hour < 22; hour++) {
      // Créneau de XX:00 à XX:30
      slots.push({
        start_time: `${hour.toString().padStart(2, '0')}:00`,
        end_time: `${hour.toString().padStart(2, '0')}:30`,
        is_available: true,
        price: fieldPrice / 2 // Prix pour 30 minutes = prix horaire divisé par 2
      });

      // Créneau de XX:30 à (XX+1):00
      slots.push({
        start_time: `${hour.toString().padStart(2, '0')}:30`,
        end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
        is_available: true,
        price: fieldPrice / 2 // Prix pour 30 minutes
      });
    }
    return slots;
  };

  // Convertir le temps en minutes depuis minuit pour faciliter les calculs
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Convertir les minutes en format HH:MM
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  const {
    data: availableSlots = generateDefaultTimeSlots(),
    isLoading
  } = useQuery({
    queryKey: ['field-availability', fieldId, selectedDate],
    queryFn: async () => {
      if (!selectedDate) return generateDefaultTimeSlots();
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Récupérer les créneaux existants pour cette date
      const {
        data: existingSlots,
        error: slotsError
      } = await supabase.from('field_availability').select('*').eq('field_id', fieldId).eq('date', dateStr);
      if (slotsError) throw slotsError;

      // Récupérer les réservations existantes pour cette date
      const {
        data: bookings,
        error: bookingsError
      } = await supabase.from('bookings').select('start_time, end_time').eq('field_id', fieldId).eq('booking_date', dateStr).in('status', ['pending', 'confirmed']);
      if (bookingsError) throw bookingsError;
      const defaultSlots = generateDefaultTimeSlots();

      // Marquer les créneaux déjà réservés comme non disponibles
      return defaultSlots.map(slot => {
        // Vérifier si ce créneau est dans une réservation existante
        const isBooked = bookings?.some(booking => {
          const bookingStart = timeToMinutes(booking.start_time);
          const bookingEnd = timeToMinutes(booking.end_time);
          const slotStart = timeToMinutes(slot.start_time);
          const slotEnd = timeToMinutes(slot.end_time);

          // Vérifier si le créneau chevauche avec une réservation
          return slotStart >= bookingStart && slotStart < bookingEnd || slotEnd > bookingStart && slotEnd <= bookingEnd || slotStart <= bookingStart && slotEnd >= bookingEnd;
        });

        // Vérifier s'il y a une disponibilité personnalisée pour ce créneau
        const customSlot = existingSlots?.find(es => es.start_time === slot.start_time && es.end_time === slot.end_time);
        return {
          ...slot,
          is_available: isBooked ? false : customSlot?.is_available ?? slot.is_available,
          price: customSlot?.price_override ?? slot.price
        };
      });
    },
    enabled: !!selectedDate
  });

  // Fonction pour afficher les créneaux occupés
  const getOccupiedSlots = (): string[] => {
    return availableSlots.filter(slot => !slot.is_available).map(slot => `${slot.start_time}-${slot.end_time}`);
  };

  // Vérifier si une plage horaire est entièrement disponible
  const isRangeAvailable = (startTime: string, endTime: string): boolean => {
    if (!startTime || !endTime) return false;
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    // Vérifier chaque créneau de 30 minutes dans la plage
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const slotStartTime = minutesToTime(minutes);
      const slotEndTime = minutesToTime(minutes + 30);
      const slot = availableSlots.find(s => s.start_time === slotStartTime && s.end_time === slotEndTime);
      if (!slot || !slot.is_available) {
        return false;
      }
    }
    return true;
  };

  // Calculer le prix total pour une plage horaire
  const calculateTotalPrice = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    let totalPrice = 0;

    // Additionner le prix de chaque créneau de 30 minutes
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const slotStartTime = minutesToTime(minutes);
      const slotEndTime = minutesToTime(minutes + 30);
      const slot = availableSlots.find(s => s.start_time === slotStartTime && s.end_time === slotEndTime);
      totalPrice += slot?.price || fieldPrice / 2; // Prix par défaut pour 30 min
    }
    return totalPrice;
  };

  // Calculer la durée en heures et minutes
  const calculateDuration = (startTime: string, endTime: string): {
    hours: number;
    minutes: number;
    display: string;
  } => {
    if (!startTime || !endTime) return {
      hours: 0,
      minutes: 0,
      display: '0h'
    };
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const totalMinutes = endMinutes - startMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    let display = '';
    if (hours > 0) display += `${hours}h`;
    if (minutes > 0) display += `${minutes}min`;
    if (display === '') display = '0h';
    return {
      hours,
      minutes,
      display
    };
  };

  // Obtenir les heures de fin disponibles selon l'heure de début
  const getAvailableEndTimes = (startTime: string): string[] => {
    if (!startTime) return [];
    const startMinutes = timeToMinutes(startTime);
    const availableEndTimes: string[] = [];

    // Vérifier chaque créneau de 30 minutes après l'heure de début
    for (let minutes = startMinutes + 30; minutes <= timeToMinutes('22:00'); minutes += 30) {
      const endTime = minutesToTime(minutes);

      // Vérifier si la plage est disponible
      if (isRangeAvailable(startTime, endTime)) {
        availableEndTimes.push(endTime);
      } else {
        // Si on trouve un créneau non disponible, on s'arrête
        break;
      }
    }
    return availableEndTimes;
  };

  // Réinitialiser l'heure de fin quand l'heure de début change
  useEffect(() => {
    if (selectedStartTime) {
      const availableEndTimes = getAvailableEndTimes(selectedStartTime);
      if (!availableEndTimes.includes(selectedEndTime)) {
        setSelectedEndTime('');
      }
    }
  }, [selectedStartTime, availableSlots]);
  const handleConfirmBooking = () => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime) return;
    const totalPrice = calculateTotalPrice(selectedStartTime, selectedEndTime);
    onTimeSlotSelect(selectedDate, selectedStartTime, selectedEndTime, totalPrice);
  };
  const disabledDays = {
    before: startOfDay(new Date()),
    after: addDays(new Date(), 30)
  };
  const timeOptions = generateTimeOptions();
  const availableEndTimes = getAvailableEndTimes(selectedStartTime);
  const rangeIsAvailable = isRangeAvailable(selectedStartTime, selectedEndTime);
  const totalPrice = calculateTotalPrice(selectedStartTime, selectedEndTime);
  const duration = calculateDuration(selectedStartTime, selectedEndTime);
  const occupiedSlots = getOccupiedSlots();
  return <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-green-600" />
            <span>Choisir une date</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={disabledDays} locale={fr} className="rounded-md border" />
        </CardContent>
      </Card>

      {selectedDate && <Card>
          <CardHeader>
            <CardTitle>
              Sélectionner les heures - {format(selectedDate, 'EEEE dd MMMM yyyy', {
            locale: fr
          })}
            </CardTitle>
            
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 bg-gray-200 rounded animate-pulse" />
              </div> : <>
                {/* Affichage des créneaux occupés */}
                {occupiedSlots.length > 0 && <div className="bg-gray-50 rounded-lg p-3 border">
                    <p className="text-sm text-gray-600 mb-2">Créneaux déjà réservés :</p>
                    <div className="flex flex-wrap gap-1">
                      {occupiedSlots.map((slot, index) => <Badge key={index} variant="secondary" className="text-xs bg-gray-200 text-gray-700">
                          {slot}
                        </Badge>)}
                    </div>
                  </div>}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Heure de début
                    </label>
                    <Select value={selectedStartTime} onValueChange={setSelectedStartTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir l'heure" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.slice(0, -1).map(time => {
                    // Vérifier si au moins un créneau de 30 min est disponible à partir de cette heure
                    const nextTime = minutesToTime(timeToMinutes(time) + 30);
                    const isSlotAvailable = availableSlots.find(s => s.start_time === time && s.end_time === nextTime)?.is_available;
                    return <SelectItem key={time} value={time} disabled={!isSlotAvailable} className="flex items-center justify-between">
                              <span>{time}</span>
                              {!isSlotAvailable && <Badge variant="secondary" className="ml-2 text-xs bg-gray-200 text-gray-600">
                                  Occupé
                                </Badge>}
                            </SelectItem>;
                  })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Heure de fin
                    </label>
                    <Select value={selectedEndTime} onValueChange={setSelectedEndTime} disabled={!selectedStartTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir l'heure" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableEndTimes.map(time => <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedStartTime && selectedEndTime && <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Durée :</span>
                          <span className="font-medium">{duration.display}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Créneau :</span>
                          <span className="font-medium">{selectedStartTime} - {selectedEndTime}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Prix :</span>
                          <span className="text-sm text-gray-500">
                            {fieldPrice.toLocaleString()} XOF/heure • {(fieldPrice / 2).toLocaleString()} XOF/30min
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t pt-2">
                          <span className="text-sm text-gray-600">Prix total :</span>
                          <span className="text-lg font-bold text-green-600 flex items-center">
                            <Euro className="w-4 h-4 mr-1" />
                            {totalPrice.toLocaleString()} XOF
                          </span>
                        </div>
                      </div>

                      {!rangeIsAvailable && <div className="flex items-center space-x-2 text-red-600 text-sm mt-3 p-2 bg-red-50 rounded">
                          <AlertCircle className="w-4 h-4" />
                          <span>Certains créneaux dans cette plage ne sont pas disponibles</span>
                        </div>}
                    </CardContent>
                  </Card>}

                <Button onClick={handleConfirmBooking} disabled={!selectedStartTime || !selectedEndTime || !rangeIsAvailable} className="w-full bg-green-600 hover:bg-green-700" size="lg">
                  Réserver {selectedStartTime && selectedEndTime && `(${totalPrice.toLocaleString()} XOF)`}
                </Button>
              </>}
          </CardContent>
        </Card>}
    </div>;
};
export default FieldCalendar;