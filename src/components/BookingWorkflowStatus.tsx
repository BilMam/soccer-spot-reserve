import React from 'react';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BookingWorkflowStatusProps {
  status: string;
  paymentStatus: string;
  showDetails?: boolean;
}

const BookingWorkflowStatus: React.FC<BookingWorkflowStatusProps> = ({ 
  status, 
  paymentStatus, 
  showDetails = false 
}) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'initiated':
        return {
          icon: <Clock className="w-4 h-4 text-yellow-600" />,
          title: "Paiement en cours",
          description: "Votre paiement est en cours de traitement. Le créneau sera réservé dès confirmation.",
          variant: "default" as const,
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200"
        };
      
      case 'confirmed':
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-600" />,
          title: "Réservation confirmée",
          description: "Votre paiement a été validé et le créneau est maintenant bloqué pour vous.",
          variant: "default" as const,
          bgColor: "bg-green-50",
          borderColor: "border-green-200"
        };
      
      case 'failed':
        return {
          icon: <XCircle className="w-4 h-4 text-red-600" />,
          title: "Paiement échoué",
          description: "Le paiement n'a pas pu être traité. Le créneau est de nouveau disponible.",
          variant: "destructive" as const,
          bgColor: "bg-red-50",
          borderColor: "border-red-200"
        };
      
      case 'expired':
        return {
          icon: <AlertCircle className="w-4 h-4 text-gray-600" />,
          title: "Session expirée",
          description: "La session de paiement a expiré après 15 minutes. Vous pouvez essayer de réserver à nouveau.",
          variant: "default" as const,
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200"
        };
      
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();
  
  if (!statusInfo || !showDetails) {
    return null;
  }

  return (
    <div className={`rounded-lg p-3 border ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
      <div className="flex items-start space-x-3">
        {statusInfo.icon}
        <div className="flex-1">
          <h4 className="font-medium text-sm">{statusInfo.title}</h4>
          <p className="text-xs text-gray-600 mt-1">{statusInfo.description}</p>
        </div>
      </div>
    </div>
  );
};

export default BookingWorkflowStatus;