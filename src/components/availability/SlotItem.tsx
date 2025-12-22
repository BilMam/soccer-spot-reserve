
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Calendar, ClipboardList } from 'lucide-react';

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

interface SlotItemProps {
  slot: AvailabilitySlot;
  index: number;
  isSelected: boolean;
  isBooked: boolean;
  onClick: () => void;
}

const SlotItem: React.FC<SlotItemProps> = ({
  slot,
  index,
  isSelected,
  isBooked,
  onClick
}) => {
  const isManualReservation = !slot.is_available && slot.unavailability_reason === 'Réservé manuellement';

  const getSlotStatusIcon = () => {
    if (isBooked) {
      return <Calendar className="w-4 h-4 text-blue-600" />;
    }
    
    if (isManualReservation) {
      return <ClipboardList className="w-4 h-4 text-indigo-600" />;
    }
    
    if (slot.is_recurring) {
      return <span className="text-lg">🔁</span>;
    }
    
    if (slot.is_available) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getSlotStatusBadge = () => {
    if (isBooked) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Réservé</Badge>;
    }
    
    if (isManualReservation) {
      return <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">📋 Réservation manuelle</Badge>;
    }
    
    if (slot.is_recurring) {
      return <Badge variant="secondary" className="bg-purple-100 text-purple-700">Récurrent</Badge>;
    }
    
    if (slot.is_available) {
      return <Badge variant="secondary" className="bg-green-100 text-green-700">Disponible</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-red-100 text-red-700">Indisponible</Badge>;
    }
  };

  const getSlotBackgroundClass = () => {
    if (slot.is_recurring) {
      return 'bg-purple-50 border-purple-300 cursor-not-allowed opacity-75';
    }
    if (isManualReservation) {
      return isSelected 
        ? 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-200 cursor-pointer'
        : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100 cursor-pointer';
    }
    if (isBooked) {
      return 'bg-blue-50 border-blue-200';
    }
    if (isSelected) {
      return 'bg-blue-50 border-blue-300 ring-2 ring-blue-200 cursor-pointer';
    }
    return 'hover:bg-gray-50 border-gray-200 cursor-pointer';
  };

  return (
    <div 
      key={slot.id || index}
      className={`flex items-center justify-between p-3 border rounded-lg transition-all ${getSlotBackgroundClass()}`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        {getSlotStatusIcon()}
        <div>
          <div className="font-medium">
            {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
          </div>
          {isBooked && !slot.is_recurring && (
            <div className="text-sm text-blue-600 font-medium">
              Réservation active
            </div>
          )}
          {isManualReservation && (
            <div className="text-sm text-indigo-600 font-medium">
              Réservation hors plateforme
            </div>
          )}
          {slot.is_recurring && slot.recurring_label && (
            <div className="text-sm text-purple-600 font-medium">
              {slot.recurring_label}
            </div>
          )}
          {slot.unavailability_reason && !isBooked && !slot.is_recurring && !isManualReservation && (
            <div className="text-sm text-gray-600">
              {slot.unavailability_reason}
            </div>
          )}
          {slot.notes && !isManualReservation && (
            <div className="text-xs text-gray-500">
              {slot.notes}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {getSlotStatusBadge()}
        {isSelected && (
          <span className="text-xs text-blue-600 font-medium">
            Sélectionné
          </span>
        )}
      </div>
    </div>
  );
};

export default SlotItem;
