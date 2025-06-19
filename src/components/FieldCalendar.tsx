
import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useFieldAvailability } from '@/hooks/useFieldAvailability';
import { timeToMinutes, minutesToTime } from '@/utils/timeUtils';
import OccupiedSlotsDisplay from '@/components/calendar/OccupiedSlotsDisplay';
import TimeSlotSelector from '@/components/calendar/TimeSlotSelector';
import BookingSummary from '@/components/calendar/BookingSummary';

interface FieldCalendarProps {
  fieldId: string;
  fieldPrice: number;
  onTimeSlotSelect: (date: Date, startTime: string, endTime: string, price: number) => void;
}

// Define the interface to match the database structure
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

const FieldCalendar: React.FC<FieldCalendarProps> = ({
  fieldId,
  fieldPrice,
  onTimeSlotSelect
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const { toast } = useToast();

  const { useFieldAvailabilityForPeriod } = useFieldAvailability(fieldId);
  
  const startDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const endDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  
  const { data: availableSlots = [], isLoading } = useFieldAvailabilityForPeriod(startDateStr, endDateStr);

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
      totalPrice += slot?.price_override || fieldPrice / 2; // Prix par défaut pour 30 min
    }
    return totalPrice;
  };

  // Réinitialiser l'heure de fin quand l'heure de début change
  useEffect(() => {
    if (selectedStartTime) {
      // Cette logique est maintenant dans TimeSlotSelector
      const availableEndTimes = getAvailableEndTimes(selectedStartTime);
      if (!availableEndTimes.includes(selectedEndTime)) {
        setSelectedEndTime('');
      }
    }
  }, [selectedStartTime, availableSlots]);

  const getAvailableEndTimes = (startTime: string): string[] => {
    if (!startTime) return [];
    const startMinutes = timeToMinutes(startTime);
    const availableEndTimes: string[] = [];

    for (let minutes = startMinutes + 30; minutes <= timeToMinutes('22:00'); minutes += 30) {
      const endTime = minutesToTime(minutes);
      
      if (isRangeAvailable(startTime, endTime)) {
        availableEndTimes.push(endTime);
      } else {
        break;
      }
    }
    return availableEndTimes;
  };

  const handleConfirmBooking = () => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une date et des heures.",
        variant: "destructive"
      });
      return;
    }
    
    const totalPrice = calculateTotalPrice(selectedStartTime, selectedEndTime);
    onTimeSlotSelect(selectedDate, selectedStartTime, selectedEndTime, totalPrice);
  };

  const disabledDays = {
    before: startOfDay(new Date()),
    after: addDays(new Date(), 30)
  };

  const rangeIsAvailable = isRangeAvailable(selectedStartTime, selectedEndTime);
  const totalPrice = calculateTotalPrice(selectedStartTime, selectedEndTime);
  const occupiedSlots = getOccupiedSlots();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-green-600" />
            <span>Choisir une date</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={disabledDays}
            locale={fr}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>
              Sélectionner les heures - {format(selectedDate, 'EEEE dd MMMM yyyy', { locale: fr })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <OccupiedSlotsDisplay occupiedSlots={occupiedSlots} />
                
                <TimeSlotSelector
                  selectedStartTime={selectedStartTime}
                  selectedEndTime={selectedEndTime}
                  onStartTimeChange={setSelectedStartTime}
                  onEndTimeChange={setSelectedEndTime}
                  availableSlots={availableSlots}
                />

                <BookingSummary
                  selectedStartTime={selectedStartTime}
                  selectedEndTime={selectedEndTime}
                  totalPrice={totalPrice}
                  fieldPrice={fieldPrice}
                  rangeIsAvailable={rangeIsAvailable}
                />

                <Button
                  onClick={handleConfirmBooking}
                  disabled={!selectedStartTime || !selectedEndTime || !rangeIsAvailable}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  Réserver {selectedStartTime && selectedEndTime && `(${totalPrice.toLocaleString()} XOF)`}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FieldCalendar;
