
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface BookingStatusBadgeProps {
  status: string;
}

const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({ 
  status
}) => {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">En attente de paiement</Badge>;
    case 'confirmed':
      return <Badge className="bg-blue-600">Confirmé</Badge>;
    case 'owner_confirmed':
      return <Badge className="bg-green-600">Confirmé par vous</Badge>;
    case 'completed':
      return <Badge className="bg-green-600">Terminé</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Annulé</Badge>;
    case 'refunded':
      return <Badge variant="destructive">Remboursé</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default BookingStatusBadge;
