
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock } from 'lucide-react';

interface OccupiedSlotsDisplayProps {
  occupiedSlots: string[];
  unavailableSlots?: string[];
  hasSlots?: boolean;
  firstAvailableTime?: string | null;
}

const OccupiedSlotsDisplay: React.FC<OccupiedSlotsDisplayProps> = ({ 
  occupiedSlots, 
  unavailableSlots = [],
  hasSlots = true,
  firstAvailableTime = null
}) => {
  const hasOccupiedOrUnavailable = occupiedSlots.length > 0 || unavailableSlots.length > 0;

  // Si aucun créneau n'a été créé
  if (!hasSlots) {
    return (
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-700 font-medium">
            Aucun créneau configuré pour cette date
          </span>
        </div>
      </div>
    );
  }

  if (!hasOccupiedOrUnavailable) {
    return (
      <div className="space-y-1">
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-700 font-medium">
              Tous les créneaux sont disponibles
            </span>
          </div>
        </div>
        {/* Afficher la ligne "Ouverture ce jour" seulement si l'heure n'est pas 08:00 (heure standard) */}
        {firstAvailableTime && firstAvailableTime !== '08:00' && (
          <div className="text-xs text-gray-500 px-3">
            Ouverture ce jour : {firstAvailableTime}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {occupiedSlots.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">
              Créneaux réservés
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {occupiedSlots.map((slot, index) => (
              <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                {slot}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {unavailableSlots.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">
              Créneaux indisponibles
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {unavailableSlots.map((slot, index) => (
              <Badge key={index} variant="secondary" className="bg-red-100 text-red-700 text-xs">
                {slot}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OccupiedSlotsDisplay;
