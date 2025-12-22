
import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { isSlotOverlappingWithBooking } from '@/utils/slotOverlapUtils';
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
  is_recurring?: boolean;
  recurring_label?: string;
  notes?: string;
}

interface BookingSlot {
  start_time: string;
  end_time: string;
}

interface DaySlotDetailsProps {
  slots: AvailabilitySlot[];
  date: Date;
  onToggleSlotStatus: (slot: AvailabilitySlot) => void;
  onReserveManually?: (slot: AvailabilitySlot) => void;
  onUnreserveManually?: (slot: AvailabilitySlot) => void;
  isUpdating?: boolean;
  fieldId: string;
  bookedSlots: Set<string>;
  bookings: BookingSlot[];
}

const DaySlotDetails: React.FC<DaySlotDetailsProps> = ({
  slots,
  date,
  onToggleSlotStatus,
  onReserveManually,
  onUnreserveManually,
  isUpdating = false,
  fieldId,
  bookedSlots,
  bookings
}) => {
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  const isSlotBooked = (slot: AvailabilitySlot): boolean => {
    // NOUVELLE LOGIQUE: Utiliser la détection de chevauchement
    const isBooked = isSlotOverlappingWithBooking(slot.start_time, slot.end_time, bookings);
    
    const dateStr = date.toISOString().split('T')[0];
    if (dateStr === '2025-06-25' || isBooked) {
      console.log('🔍 DaySlotDetails - Vérification créneau:', {
        date: dateStr,
        slotTime: `${slot.start_time}-${slot.end_time}`,
        isBooked,
        bookingsCount: bookings.length,
        bookingsList: bookings
      });
    }
    
    return isBooked;
  };

  const canMarkUnavailable = (slot: AvailabilitySlot): boolean => {
    // Ne pas permettre la modification des créneaux récurrents ou réservés manuellement
    return slot.is_available && !isSlotBooked(slot) && !slot.is_recurring;
  };

  const handleSlotClick = (slot: AvailabilitySlot) => {
    // Ne pas permettre la sélection des créneaux récurrents
    if (slot.is_recurring) return;
    setSelectedSlot(selectedSlot?.id === slot.id ? null : slot);
  };

  const handleToggleStatus = () => {
    if (selectedSlot) {
      onToggleSlotStatus(selectedSlot);
      setSelectedSlot(null);
    }
  };

  const handleReserveManually = () => {
    if (selectedSlot && onReserveManually) {
      onReserveManually(selectedSlot);
      setSelectedSlot(null);
    }
  };

  const handleUnreserveManually = () => {
    if (selectedSlot && onUnreserveManually) {
      onUnreserveManually(selectedSlot);
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

  // DEBUG: Vérifier les données reçues
  const dateStr = date.toISOString().split('T')[0];
  if (dateStr === '2025-06-25' || bookings.length > 0) {
    console.log('🔍 DaySlotDetails - DONNÉES REÇUES:', {
      date: dateStr,
      slotsCount: slots.length,
      bookingsCount: bookings.length,
      bookingsList: bookings,
      bookedSlotsCount: bookedSlots.size,
      bookedSlotsList: Array.from(bookedSlots)
    });
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
          onReserveManually={onReserveManually ? handleReserveManually : undefined}
          onUnreserveManually={onUnreserveManually ? handleUnreserveManually : undefined}
        />
      )}

      <SlotStatistics
        slots={slots}
        bookedSlotsCount={bookings.length}
        isSlotBooked={isSlotBooked}
      />
    </div>
  );
};

export default DaySlotDetails;
