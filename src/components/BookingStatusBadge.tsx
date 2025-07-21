
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface BookingStatusBadgeProps {
  status: string;
}

const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({ 
  status
}) => {
  switch (status) {
    case 'initiated':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Paiement en cours</Badge>;
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
    case 'failed':
      return <Badge variant="destructive">Paiement échoué</Badge>;
    case 'expired':
      return <Badge variant="destructive" className="bg-gray-500">Expiré</Badge>;
    case 'refunded':
      return <Badge variant="destructive">Remboursé</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default BookingStatusBadge;
