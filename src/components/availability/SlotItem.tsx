
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Calendar } from 'lucide-react';

interface AvailabilitySlot {
  id?: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  unavailability_reason?: string;
  is_maintenance?: boolean;
  notes?: string;
  is_recurring?: boolean;
  recurring_label?: string;
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
  const getSlotStatusIcon = () => {
    if (isBooked) {
      return <Calendar className="w-4 h-4 text-blue-600" />;
    }
    
    if (slot.is_recurring) {
      return (
        <div className="relative">
          <CheckCircle className="w-4 h-4 text-purple-600" />
        </div>
      );
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
    
    if (slot.is_recurring) {
      return <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-300 border-dashed">Récurrent</Badge>;
    }
    
    if (slot.is_available) {
      return <Badge variant="secondary" className="bg-green-100 text-green-700">Disponible</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-red-100 text-red-700">Indisponible</Badge>;
    }
  };

  return (
    <div 
      key={slot.id || index}
      className={`
        flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all
        ${isSelected 
          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
          : 'hover:bg-gray-50 border-gray-200'
        }
        ${isBooked ? 'bg-blue-50 border-blue-200' : ''}
        ${slot.is_recurring && !isBooked ? 'bg-purple-50 border-purple-200 border-dashed' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        {getSlotStatusIcon()}
        <div>
          <div className="font-medium">
            {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
          </div>
          {slot.is_recurring && slot.recurring_label && (
            <div className="text-xs text-purple-600 font-medium">
              {slot.recurring_label}
            </div>
          )}
          {isBooked && (
            <div className="text-sm text-blue-600 font-medium">
              Réservation active
            </div>
          )}
          {slot.unavailability_reason && !isBooked && (
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
