
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface SlotStatusBadgeProps {
  status: 'available' | 'booked' | 'unavailable' | 'not_created';
}

const SlotStatusBadge: React.FC<SlotStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'available':
      return (
        <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700">
          Disponible
        </Badge>
      );
    case 'booked':
      return (
        <Badge variant="secondary" className="ml-2 text-xs bg-red-100 text-red-700">
          Réservé
        </Badge>
      );
    case 'unavailable':
      return (
        <Badge variant="secondary" className="ml-2 text-xs bg-orange-100 text-orange-700">
          Indisponible
        </Badge>
      );
    case 'not_created':
      return (
        <Badge variant="secondary" className="ml-2 text-xs bg-gray-100 text-gray-600">
          Pas de créneau
        </Badge>
      );
    default:
      return null;
  }
};

export default SlotStatusBadge;
