
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { timeToMinutes, minutesToTime, normalizeTime } from '@/utils/timeUtils';
import { supabase } from '@/integrations/supabase/client';
import OccupiedSlotsDisplay from '@/components/calendar/OccupiedSlotsDisplay';
import TimeSlotSelector from '@/components/calendar/TimeSlotSelector';
import BookingSummary from '@/components/calendar/BookingSummary';

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
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [unavailableSlots, setUnavailableSlots] = useState<string[]>([]);
  const { toast } = useToast();

  // Debug: Afficher les informations reçues
  console.log('🔍 SlotBookingInterface - Date sélectionnée:', format(selectedDate, 'yyyy-MM-dd'));
  console.log('🔍 SlotBookingInterface - Field ID:', fieldId);
  console.log('🔍 SlotBookingInterface - Créneaux reçus:', availableSlots.length);
  console.log('🔍 SlotBookingInterface - Détails créneaux:', availableSlots);

  // Récupérer les créneaux réservés et indisponibles
  useEffect(() => {
    const fetchSlotStatus = async () => {
      if (!selectedDate) return;
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      console.log('🔍 Vérification statut créneaux pour:', dateStr);
      
      try {
        // Récupérer les réservations actives
        const { data: bookings, error: bookingError } = await supabase
          .from('bookings')
          .select('start_time, end_time')
          .eq('field_id', fieldId)
          .eq('booking_date', dateStr)
          .in('status', ['pending', 'confirmed', 'owner_confirmed']);

        if (bookingError) {
          console.error('Erreur lors de la récupération des réservations:', bookingError);
        } else {
          const booked = bookings?.map(booking => `${normalizeTime(booking.start_time)}-${normalizeTime(booking.end_time)}`) || [];
          console.log('🔍 Créneaux réservés trouvés:', booked);
          setBookedSlots(booked);
        }

        // Séparer les créneaux indisponibles (pas de réservation mais is_available = false)
        const unavailable = availableSlots
          .filter(slot => !slot.is_available)
          .filter(slot => {
            const slotKey = `${normalizeTime(slot.start_time)}-${normalizeTime(slot.end_time)}`;
            return !bookings?.some(booking => 
              `${normalizeTime(booking.start_time)}-${normalizeTime(booking.end_time)}` === slotKey
            );
          })
          .map(slot => `${normalizeTime(slot.start_time)}-${normalizeTime(slot.end_time)}`);
        
        console.log('🔍 Créneaux indisponibles trouvés:', unavailable);
        setUnavailableSlots(unavailable);
      } catch (error) {
        console.error('Erreur lors de la vérification des créneaux:', error);
      }
    };

    fetchSlotStatus();
  }, [selectedDate, fieldId, availableSlots]);

  // Vérifier si une plage horaire est entièrement disponible
  const isRangeAvailable = (startTime: string, endTime: string): boolean => {
    if (!startTime || !endTime) return false;
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    console.log('🔍 isRangeAvailable - Vérification plage:', `${startTime}-${endTime}`);

    // Vérifier chaque créneau de 30 minutes dans la plage
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const slotStartTime = minutesToTime(minutes);
      const slotEndTime = minutesToTime(minutes + 30);
      
      // Normaliser les temps pour la comparaison
      const normalizedSlotStart = normalizeTime(slotStartTime);
      const normalizedSlotEnd = normalizeTime(slotEndTime);
      
      const slot = availableSlots.find(s => {
        const normalizedDbStart = normalizeTime(s.start_time);
        const normalizedDbEnd = normalizeTime(s.end_time);
        const match = normalizedDbStart === normalizedSlotStart && normalizedDbEnd === normalizedSlotEnd;
        
        if (match) {
          console.log('🔍 Slot trouvé pour vérification:', {
            recherché: `${normalizedSlotStart}-${normalizedSlotEnd}`,
            trouvé: `${normalizedDbStart}-${normalizedDbEnd}`,
            available: s.is_available
          });
        }
        
        return match;
      });
      
      // Le créneau doit exister ET être disponible ET ne pas être réservé
      if (!slot || !slot.is_available) {
        console.log('🔍 Créneau non disponible ou inexistant:', `${normalizedSlotStart}-${normalizedSlotEnd}`);
        return false;
      }
      
      // Vérifier qu'il n'est pas réservé
      const slotKey = `${normalizedSlotStart}-${normalizedSlotEnd}`;
      if (bookedSlots.includes(slotKey)) {
        console.log('🔍 Créneau réservé:', slotKey);
        return false;
      }
    }
    
    console.log('🔍 Plage entièrement disponible:', `${startTime}-${endTime}`);
    return true;
  };

  // Calculer le prix total pour une plage horaire
  const calculateTotalPrice = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    let totalPrice = 0;

    console.log('🔍 calculateTotalPrice - Calcul pour:', `${startTime}-${endTime}`);

    // Additionner le prix de chaque créneau de 30 minutes
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const slotStartTime = minutesToTime(minutes);
      const slotEndTime = minutesToTime(minutes + 30);
      
      // Normaliser les temps pour la comparaison
      const normalizedSlotStart = normalizeTime(slotStartTime);
      const normalizedSlotEnd = normalizeTime(slotEndTime);
      
      const slot = availableSlots.find(s => {
        const normalizedDbStart = normalizeTime(s.start_time);
        const normalizedDbEnd = normalizeTime(s.end_time);
        return normalizedDbStart === normalizedSlotStart && normalizedDbEnd === normalizedSlotEnd;
      });
      
      const slotPrice = slot?.price_override || fieldPrice / 2; // Prix par défaut pour 30 min
      totalPrice += slotPrice;
      
      console.log('🔍 Prix créneau:', `${normalizedSlotStart}-${normalizedSlotEnd}`, 'prix:', slotPrice);
    }
    
    console.log('🔍 Prix total calculé:', totalPrice);
    return totalPrice;
  };

  // Réinitialiser l'heure de fin quand l'heure de début change
  useEffect(() => {
    if (selectedStartTime) {
      setSelectedEndTime('');
    }
  }, [selectedStartTime, availableSlots]);

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

  const rangeIsAvailable = isRangeAvailable(selectedStartTime, selectedEndTime);
  const totalPrice = calculateTotalPrice(selectedStartTime, selectedEndTime);

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
  );
};

export default SlotBookingInterface;
