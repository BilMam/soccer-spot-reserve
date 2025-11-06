
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface BookingStatusBadgeProps {
  status: string;
}

const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({ 
  status
}) => {
  switch (status) {
    case 'confirmed':
      return <Badge className="bg-blue-600">Confirmée</Badge>;
    case 'completed':
      return <Badge variant="secondary" className="text-gray-600">Terminée</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Annulée</Badge>;
    default:
      return <Badge variant="outline">Statut inconnu</Badge>;
  }
};

export default BookingStatusBadge;
