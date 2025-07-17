
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="secondary">
          <Clock className="w-4 h-4 mr-1" />
          En attente
        </Badge>
      );
    case 'approved':
      return (
        <Badge variant="default">
          <CheckCircle className="w-4 h-4 mr-1" />
          Approuvée
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="destructive">
          <XCircle className="w-4 h-4 mr-1" />
          Rejetée
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};
