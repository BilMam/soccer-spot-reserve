import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

        const bookedSlotKeys = new Set(
          bookings?.map(booking => `${booking.start_time}-${booking.end_time}`) || []
        );
        
        setBookedSlots(bookedSlotKeys);
      } catch (error) {
        console.error('Erreur lors de la vérification des réservations:', error);
      } finally {
        setLoadingBookedSlots(false);
      }
    };

    checkBookedSlots();
  }, [slots, date, fieldId]);

  const getSlotStatusIcon = (slot: AvailabilitySlot) => {
    const slotKey = `${slot.start_time}-${slot.end_time}`;
    
    if (bookedSlots.has(slotKey)) {
      return <Calendar className="w-4 h-4 text-blue-600" />;
    }
    
    if (slot.is_available) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getSlotStatusBadge = (slot: AvailabilitySlot) => {
    const slotKey = `${slot.start_time}-${slot.end_time}`;
    
    if (bookedSlots.has(slotKey)) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Réservé</Badge>;
    }
    
    if (slot.is_available) {
      return <Badge variant="secondary" className="bg-green-100 text-green-700">Disponible</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-red-100 text-red-700">Indisponible</Badge>;
    }
  };

  const isSlotBooked = (slot: AvailabilitySlot): boolean => {
    const slotKey = `${slot.start_time}-${slot.end_time}`;
    return bookedSlots.has(slotKey);
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
      setSelectedSlot(null); // Désélectionner après l'action
    }
  };

  const getToggleButtonText = () => {
    if (!selectedSlot) return '';
    
    if (isSlotBooked(selectedSlot)) {
      return 'Créneau réservé';
    }
    
    return selectedSlot.is_available ? 'Marquer indisponible' : 'Marquer disponible';
  };

  const getToggleButtonVariant = () => {
    if (!selectedSlot) return 'default';
    
    if (isSlotBooked(selectedSlot)) {
      return 'secondary';
    }
    
    return selectedSlot.is_available ? 'destructive' : 'default';
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
        {sortedSlots.map((slot, index) => {
          const isSelected = selectedSlot?.id === slot.id;
          const slotIsBooked = isSlotBooked(slot);
          
          return (
            <div 
              key={slot.id || index}
              className={`
                flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all
                ${isSelected 
                  ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
                  : 'hover:bg-gray-50 border-gray-200'
                }
                ${slotIsBooked ? 'bg-blue-50 border-blue-200' : ''}
              `}
              onClick={() => handleSlotClick(slot)}
            >
              <div className="flex items-center space-x-3">
                {getSlotStatusIcon(slot)}
                <div>
                  <div className="font-medium">
                    {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                  </div>
                  {slotIsBooked && (
                    <div className="text-sm text-blue-600 font-medium">
                      Réservation active
                    </div>
                  )}
                  {slot.unavailability_reason && !slotIsBooked && (
                    <div className="text-sm text-gray-600">
                      {slot.unavailability_reason}
                    </div>
                  )}
                  {slot.notes && (
                    <div className="text-xs text-gray-500">
                      {slot.notes}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {getSlotStatusBadge(slot)}
                {isSelected && (
                  <span className="text-xs text-blue-600 font-medium">
                    Sélectionné
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bouton d'action pour le créneau sélectionné */}
      {selectedSlot && (
        <div className="pt-4 border-t bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <div className="font-medium">
                Créneau sélectionné : {selectedSlot.start_time.slice(0, 5)} - {selectedSlot.end_time.slice(0, 5)}
              </div>
              <div className="text-gray-600">
                {isSlotBooked(selectedSlot) 
                  ? 'Statut : Réservé (modification impossible)'
                  : `Statut actuel : ${selectedSlot.is_available ? 'Disponible' : 'Indisponible'}`
                }
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSlot(null)}
              >
                Annuler
              </Button>
              <Button
                variant={getToggleButtonVariant()}
                size="sm"
                onClick={handleToggleStatus}
                disabled={isUpdating || isSlotBooked(selectedSlot) || (selectedSlot.is_available && !canMarkUnavailable(selectedSlot))}
              >
                {getToggleButtonText()}
              </Button>
            </div>
          </div>
          
          {isSlotBooked(selectedSlot) && (
            <div className="mt-2 text-xs text-blue-600 bg-blue-100 p-2 rounded">
              ℹ️ Ce créneau ne peut pas être marqué comme indisponible car il a une réservation active.
            </div>
          )}
        </div>
      )}

      {/* Statistiques rapides */}
      <div className="grid grid-cols-3 gap-2 pt-4 border-t">
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">
            {slots.filter(s => s.is_available && !isSlotBooked(s)).length}
          </div>
          <div className="text-xs text-gray-600">Disponibles</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">
            {Array.from(bookedSlots).length}
          </div>
          <div className="text-xs text-gray-600">Réservés</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-600">
            {slots.filter(s => !s.is_available).length}
          </div>
          <div className="text-xs text-gray-600">Indisponibles</div>
        </div>
      </div>
    </div>
  );
};

export default DaySlotDetails;
