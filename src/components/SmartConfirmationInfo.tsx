
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Zap, AlertTriangle, Calendar, CheckCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SmartConfirmationInfoProps {
  booking: {
    confirmation_window_type?: string;
    confirmation_deadline?: string;
    auto_action?: string;
    time_until_slot?: unknown;
    booking_date: string;
    start_time: string;
  };
}

const SmartConfirmationInfo: React.FC<SmartConfirmationInfoProps> = ({ booking }) => {
  if (!booking.confirmation_window_type) {
    return null;
  }

  const getWindowInfo = (windowType: string) => {
    switch (windowType) {
      case 'auto':
        return {
          label: 'Auto-confirmation',
          description: 'Confirmé automatiquement (créneau ≤ 1h)',
          icon: Zap,
          color: 'bg-green-600',
          urgent: false
        };
      case 'express':
        return {
          label: 'Fenêtre express',
          description: 'Délai court - Auto-confirmation si pas de réponse',
          icon: Clock,
          color: 'bg-orange-600',
          urgent: true
        };
      case 'short':
        return {
          label: 'Fenêtre courte',
          description: 'Remboursement automatique si pas de réponse',
          icon: AlertTriangle,
          color: 'bg-yellow-600',
          urgent: true
        };
      case 'standard':
        return {
          label: 'Fenêtre standard',
          description: 'Délai de 24h pour confirmer',
          icon: Calendar,
          color: 'bg-blue-600',
          urgent: false
        };
      case 'long':
        return {
          label: 'Fenêtre longue',
          description: 'Délai de 48h pour confirmer',
          icon: CheckCircle,
          color: 'bg-gray-600',
          urgent: false
        };
      default:
        return null;
    }
  };

  const windowInfo = getWindowInfo(booking.confirmation_window_type);
  if (!windowInfo) return null;

  const IconComponent = windowInfo.icon;
  const deadline = booking.confirmation_deadline ? new Date(booking.confirmation_deadline) : null;
  const timeLeft = deadline ? formatDistanceToNow(deadline, { locale: fr }) : null;

  return (
    <Card className={`border-l-4 ${windowInfo.urgent ? 'border-l-orange-500 bg-orange-50' : 'border-l-blue-500 bg-blue-50'}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-full ${windowInfo.color} text-white`}>
            <IconComponent className="w-4 h-4" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{windowInfo.label}</h4>
              <Badge variant={windowInfo.urgent ? "destructive" : "default"}>
                {booking.auto_action === 'confirm' ? 'Auto-confirmation' : 'Auto-remboursement'}
              </Badge>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">
              {windowInfo.description}
            </p>
            
            {deadline && booking.confirmation_window_type !== 'auto' && (
              <div className="text-sm space-y-1">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3 h-3 text-gray-500" />
                  <span className="text-gray-700">
                    Échéance : {format(deadline, 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </span>
                </div>
                {timeLeft && (
                  <div className="text-xs text-gray-500">
                    Temps restant : {timeLeft}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartConfirmationInfo;
