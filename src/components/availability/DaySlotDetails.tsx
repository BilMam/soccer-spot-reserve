import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeTime } from '@/utils/timeUtils';
import SlotItem from './SlotItem';
import SlotActions from './SlotActions';
import SlotStatistics from './SlotStatistics';

interface AvailabilitySlot {
  id?: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  unavailability_reason?: string;
  is_maintenance?: boolean;
  notes?: string;
}

interface DaySlotDetailsProps {
  slots: AvailabilitySlot[];
  date: Date;
  onToggleSlotStatus: (slot: AvailabilitySlot) => void;
  isUpdating?: boolean;
  fieldId: string;
}

const DaySlotDetails: React.FC<DaySlotDetailsProps> = ({
  slots,
  date,
  onToggleSlotStatus,
  isUpdating = false,
  fieldId
}) => {
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [loadingBookedSlots, setLoadingBookedSlots] = useState(false);

  // Vérifier les créneaux réservés quand les slots changent
  useEffect(() => {
    const checkBookedSlots = async () => {
      if (slots.length === 0) return;
      
      setLoadingBookedSlots(true);
      const dateStr = date.toISOString().split('T')[0];
      
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

        // CORRECTION: Normaliser les clés pour correspondre à useBookingData
        const bookedSlotKeys = new Set(
          bookings?.map(booking => {
            const normalizedStart = normalizeTime(booking.start_time);
            const normalizedEnd = normalizeTime(booking.end_time);
            const slotKey = `${normalizedStart}-${normalizedEnd}`;
            
            console.log('🔍 DaySlotDetails - Slot réservé normalisé:', {
              original: `${booking.start_time}-${booking.end_time}`,
              normalized: slotKey,
              date: dateStr
            });
            
            return slotKey;
          }) || []
        );
        
        setBookedSlots(bookedSlotKeys);
        console.log('🔍 DaySlotDetails - Créneaux réservés finaux:', Array.from(bookedSlotKeys));
      } catch (error) {
        console.error('Erreur lors de la vérification des réservations:', error);
      } finally {
        setLoadingBookedSlots(false);
      }
    };

    checkBookedSlots();
  }, [slots, date, fieldId]);

  const isSlotBooked = (slot: AvailabilitySlot): boolean => {
    // CORRECTION: Utiliser normalizeTime pour créer des clés cohérentes
    const normalizedStart = normalizeTime(slot.start_time);
    const normalizedEnd = normalizeTime(slot.end_time);
    const slotKey = `${normalizedStart}-${normalizedEnd}`;
    const isBooked = bookedSlots.has(slotKey);
    
    console.log('🔍 DaySlotDetails - isSlotBooked:', {
      slotOriginal: `${slot.start_time}-${slot.end_time}`,
      slotNormalized: slotKey,
      isBooked,
      bookedSlotsArray: Array.from(bookedSlots)
    });
    
    return isBooked;
  };

  const canMarkUnavailable = (slot: AvailabilitySlot): boolean => {
    return slot.is_available && !isSlotBooked(slot);
  };

  const handleSlotClick = (slot: AvailabilitySlot) => {
    setSelectedSlot(selectedSlot?.id === slot.id ? null : slot);
  };

  const handleToggleStatus = () => {
    if (selectedSlot) {
      onToggleSlotStatus(selectedSlot);
      setSelectedSlot(null);
    }
  };

  const sortedSlots = [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time));

  if (slots.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">
          Aucun créneau défini
        </h3>
        <p className="text-gray-500">
          Créez d'abord des créneaux pour cette période depuis l'onglet "Création créneaux".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">
          Créneaux du {date.toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
          })}
        </h4>
        <div className="text-sm text-gray-500">
          {slots.length} créneau{slots.length > 1 ? 'x' : ''}
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2">
        {sortedSlots.map((slot, index) => (
          <SlotItem
            key={slot.id || index}
            slot={slot}
            index={index}
            isSelected={selectedSlot?.id === slot.id}
            isBooked={isSlotBooked(slot)}
            onClick={() => handleSlotClick(slot)}
          />
        ))}
      </div>

      {selectedSlot && (
        <SlotActions
          selectedSlot={selectedSlot}
          isBooked={isSlotBooked(selectedSlot)}
          isUpdating={isUpdating}
          canMarkUnavailable={canMarkUnavailable(selectedSlot)}
          onCancel={() => setSelectedSlot(null)}
          onToggleStatus={handleToggleStatus}
        />
      )}

      <SlotStatistics
        slots={slots}
        bookedSlotsCount={Array.from(bookedSlots).length}
        isSlotBooked={isSlotBooked}
      />
    </div>
  );
};

export default DaySlotDetails;
