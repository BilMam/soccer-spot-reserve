
import React from 'react';
import { Button } from '@/components/ui/button';

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

interface SlotActionsProps {
  selectedSlot: AvailabilitySlot;
  isBooked: boolean;
  isUpdating: boolean;
  canMarkUnavailable: boolean;
  onCancel: () => void;
  onToggleStatus: () => void;
  onReserveManually?: () => void;
  onUnreserveManually?: () => void;
}

const SlotActions: React.FC<SlotActionsProps> = ({
  selectedSlot,
  isBooked,
  isUpdating,
  canMarkUnavailable,
  onCancel,
  onToggleStatus,
  onReserveManually,
  onUnreserveManually
}) => {
  const isManualReservation = !selectedSlot.is_available && selectedSlot.unavailability_reason === 'Réservé manuellement';

  const getStatusText = () => {
    if (isBooked) {
      return 'Statut : Réservé en ligne (modification impossible)';
    }
    if (isManualReservation) {
      return 'Statut : Réservé manuellement';
    }
    return `Statut actuel : ${selectedSlot.is_available ? 'Disponible' : 'Indisponible'}`;
  };

  return (
    <div className="pt-4 border-t bg-gray-50 p-4 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <div className="font-medium">
            Créneau sélectionné : {selectedSlot.start_time.slice(0, 5)} - {selectedSlot.end_time.slice(0, 5)}
          </div>
          <div className="text-gray-600">
            {getStatusText()}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          Annuler
        </Button>
      </div>
      
      {/* Actions disponibles selon le statut */}
      <div className="flex flex-wrap gap-2">
        {/* Créneau réservé en ligne - aucune action possible */}
        {isBooked && (
          <Button
            variant="secondary"
            size="sm"
            disabled
          >
            Créneau réservé
          </Button>
        )}
        
        {/* Créneau réservé manuellement - annuler la réservation */}
        {!isBooked && isManualReservation && onUnreserveManually && (
          <Button
            variant="default"
            size="sm"
            onClick={onUnreserveManually}
            disabled={isUpdating}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Annuler la réservation manuelle
          </Button>
        )}
        
        {/* Créneau disponible - deux options */}
        {!isBooked && !isManualReservation && selectedSlot.is_available && (
          <>
            {onReserveManually && (
              <Button
                variant="default"
                size="sm"
                onClick={onReserveManually}
                disabled={isUpdating}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                📋 Réserver manuellement
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={onToggleStatus}
              disabled={isUpdating || !canMarkUnavailable}
            >
              Marquer indisponible
            </Button>
          </>
        )}
        
        {/* Créneau indisponible (maintenance) - rendre disponible */}
        {!isBooked && !isManualReservation && !selectedSlot.is_available && (
          <Button
            variant="default"
            size="sm"
            onClick={onToggleStatus}
            disabled={isUpdating}
          >
            Marquer disponible
          </Button>
        )}
      </div>
      
      {isBooked && (
        <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
          ℹ️ Ce créneau ne peut pas être modifié car il a une réservation active en ligne.
        </div>
      )}
      
      {isManualReservation && (
        <div className="text-xs text-indigo-600 bg-indigo-100 p-2 rounded">
          📋 Ce créneau a été réservé manuellement (hors plateforme). Vous pouvez annuler cette réservation pour le rendre à nouveau disponible.
        </div>
      )}
    </div>
  );
};

export default SlotActions;
