
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface OccupiedSlotsDisplayProps {
  occupiedSlots: string[];
}

const OccupiedSlotsDisplay: React.FC<OccupiedSlotsDisplayProps> = ({ occupiedSlots }) => {
  if (occupiedSlots.length === 0) return null;

  return (
    <div className="bg-gray-50 rounded-lg p-3 border">
      <p className="text-sm text-gray-600 mb-2">Créneaux déjà réservés :</p>
      <div className="flex flex-wrap gap-1">
        {occupiedSlots.map((slot, index) => (
          <Badge key={index} variant="secondary" className="text-xs bg-gray-200 text-gray-700">
            {slot}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default OccupiedSlotsDisplay;
