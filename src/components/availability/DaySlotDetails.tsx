
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

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
}

const DaySlotDetails: React.FC<DaySlotDetailsProps> = ({
  slots,
  date,
  onToggleSlotStatus,
  isUpdating = false
}) => {
  const getSlotStatusIcon = (slot: AvailabilitySlot) => {
    if (slot.is_available) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getSlotStatusBadge = (slot: AvailabilitySlot) => {
    if (slot.is_available) {
      return <Badge variant="secondary" className="bg-green-100 text-green-700">Disponible</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-red-100 text-red-700">Indisponible</Badge>;
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
          <div 
            key={slot.id || index}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              {getSlotStatusIcon(slot)}
              <div>
                <div className="font-medium">
                  {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                </div>
                {slot.unavailability_reason && (
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleSlotStatus(slot)}
                disabled={isUpdating}
                className="text-xs"
              >
                {slot.is_available ? 'Marquer indispo' : 'Marquer dispo'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 gap-2 pt-4 border-t">
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">
            {slots.filter(s => s.is_available).length}
          </div>
          <div className="text-xs text-gray-600">Disponibles</div>
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
