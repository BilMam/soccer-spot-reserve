
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { normalizeTime } from '@/utils/timeUtils';
import { SlotValidationLogic } from './SlotValidationLogic';
import { SlotPriceCalculator } from './SlotPriceCalculator';
import OccupiedSlotsDisplay from './OccupiedSlotsDisplay';
import TimeSlotSelector from './TimeSlotSelector';
import BookingSummary from './BookingSummary';
import SlotBookingActions from './SlotBookingActions';
import { useBookingData } from '@/hooks/useBookingData';

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

interface SlotBookingInterfaceProps {
  selectedDate: Date;
  fieldId: string;
  fieldPrice: number;
  availableSlots: AvailabilitySlot[];
  isLoading: boolean;
  onTimeSlotSelect: (date: Date, startTime: string, endTime: string, price: number) => void;
}

const SlotBookingInterface: React.FC<SlotBookingInterfaceProps> = ({
  selectedDate,
  fieldId,
  fieldPrice,
  availableSlots,
  isLoading,
  onTimeSlotSelect
}) => {
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [unavailableSlots, setUnavailableSlots] = useState<string[]>([]);

  // Utiliser le hook temps réel pour les réservations
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { bookedSlotsByDate, bookingsByDate } = useBookingData(fieldId, dateStr, dateStr);
  
  // Convertir les données du hook au format attendu
  const bookedSlots = Array.from(bookedSlotsByDate[dateStr] || []);
  const bookings = bookingsByDate[dateStr] || [];

  // Debug: Afficher les informations reçues
  console.log('🔍 SlotBookingInterface - Date sélectionnée:', dateStr);
  console.log('🔍 SlotBookingInterface - Field ID:', fieldId);
  console.log('🔍 SlotBookingInterface - Créneaux reçus:', availableSlots.length);
  console.log('🔍 SlotBookingInterface - Créneaux réservés (temps réel):', bookedSlots);

  // Calculer les créneaux indisponibles (pas de réservation mais is_available = false)
  useEffect(() => {
    const unavailable = availableSlots
      .filter(slot => !slot.is_available)
      .filter(slot => {
        const slotKey = `${normalizeTime(slot.start_time)}-${normalizeTime(slot.end_time)}`;
        return !bookedSlots.includes(slotKey);
      })
      .map(slot => `${normalizeTime(slot.start_time)}-${normalizeTime(slot.end_time)}`);
    
    console.log('🔍 Créneaux indisponibles trouvés:', unavailable);
    setUnavailableSlots(unavailable);
  }, [availableSlots, bookedSlots]);

  // Réinitialiser l'heure de fin quand l'heure de début change
  useEffect(() => {
    if (selectedStartTime) {
      setSelectedEndTime('');
    }
  }, [selectedStartTime, availableSlots]);

  // Initialize utility classes
  const validator = new SlotValidationLogic(availableSlots, bookedSlots);
  const priceCalculator = new SlotPriceCalculator(availableSlots, fieldPrice);

  const rangeIsAvailable = validator.isRangeAvailable(selectedStartTime, selectedEndTime);
  const totalPrice = priceCalculator.calculateTotalPrice(selectedStartTime, selectedEndTime);

  // Vérifier si aucun créneau n'a été créé pour ce jour
  const hasNoSlots = availableSlots.length === 0;

  return (
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
        ) : hasNoSlots ? (
          <div className="text-center py-8 text-gray-500">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-medium text-yellow-800 mb-2">
                Aucun créneau disponible
              </h3>
              <p className="text-sm text-yellow-700">
                Aucun créneau n'a été configuré pour cette date. 
                Veuillez sélectionner une autre date ou contacter le propriétaire.
              </p>
            </div>
          </div>
        ) : (
          <>
            <OccupiedSlotsDisplay 
              occupiedSlots={bookedSlots} 
              unavailableSlots={unavailableSlots}
            />
            
            <TimeSlotSelector
              selectedStartTime={selectedStartTime}
              selectedEndTime={selectedEndTime}
              onStartTimeChange={setSelectedStartTime}
              onEndTimeChange={setSelectedEndTime}
              availableSlots={availableSlots}
              fieldId={fieldId}
              bookedSlots={bookedSlots}
              bookings={bookings}
            />

            <BookingSummary
              selectedStartTime={selectedStartTime}
              selectedEndTime={selectedEndTime}
              totalPrice={totalPrice}
              fieldPrice={fieldPrice}
              rangeIsAvailable={rangeIsAvailable}
            />

            <SlotBookingActions
              selectedDate={selectedDate}
              selectedStartTime={selectedStartTime}
              selectedEndTime={selectedEndTime}
              availableSlots={availableSlots}
              bookedSlots={bookedSlots}
              fieldPrice={fieldPrice}
              onTimeSlotSelect={onTimeSlotSelect}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SlotBookingInterface;
