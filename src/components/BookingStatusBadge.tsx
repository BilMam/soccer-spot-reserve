
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface BookingStatusBadgeProps {
  status: string;
  escrowStatus?: string;
  windowType?: string;
}

const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({ 
  status, 
  escrowStatus, 
  windowType 
}) => {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">En attente de paiement</Badge>;
    case 'confirmed':
      if (escrowStatus === 'funds_held') {
        const urgentTypes = ['express', 'short'];
        const isUrgent = urgentTypes.includes(windowType || '');
        return (
          <Badge className={isUrgent ? "bg-orange-600" : "bg-blue-600"}>
            {isUrgent ? 'URGENT - Confirmation requise' : 'Payé - Confirmation requise'}
          </Badge>
        );
      }
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
