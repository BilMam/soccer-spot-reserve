
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
}

const SlotActions: React.FC<SlotActionsProps> = ({
  selectedSlot,
  isBooked,
  isUpdating,
  canMarkUnavailable,
  onCancel,
  onToggleStatus
}) => {
  const getToggleButtonText = () => {
    if (isBooked) {
      return 'Créneau réservé';
    }
    
    return selectedSlot.is_available ? 'Marquer indisponible' : 'Marquer disponible';
  };

  const getToggleButtonVariant = () => {
    if (isBooked) {
      return 'secondary';
    }
    
    return selectedSlot.is_available ? 'destructive' : 'default';
  };

  return (
    <div className="pt-4 border-t bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <div className="font-medium">
            Créneau sélectionné : {selectedSlot.start_time.slice(0, 5)} - {selectedSlot.end_time.slice(0, 5)}
          </div>
          <div className="text-gray-600">
            {isBooked 
              ? 'Statut : Réservé (modification impossible)'
              : `Statut actuel : ${selectedSlot.is_available ? 'Disponible' : 'Indisponible'}`
            }
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
          >
            Annuler
          </Button>
          <Button
            variant={getToggleButtonVariant()}
            size="sm"
            onClick={onToggleStatus}
            disabled={isUpdating || isBooked || (selectedSlot.is_available && !canMarkUnavailable)}
          >
            {getToggleButtonText()}
          </Button>
        </div>
      </div>
      
      {isBooked && (
        <div className="mt-2 text-xs text-blue-600 bg-blue-100 p-2 rounded">
          ℹ️ Ce créneau ne peut pas être marqué comme indisponible car il a une réservation active.
        </div>
      )}
    </div>
  );
};

export default SlotActions;
