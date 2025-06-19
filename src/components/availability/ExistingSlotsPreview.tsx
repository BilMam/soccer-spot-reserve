
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Calendar, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface ExistingSlotsPreviewProps {
  existingSlots: AvailabilitySlot[];
  startDate: Date;
  endDate: Date;
  onReplace: () => void;
  onComplete: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ExistingSlotsPreview: React.FC<ExistingSlotsPreviewProps> = ({
  existingSlots,
  startDate,
  endDate,
  onReplace,
  onComplete,
  onCancel,
  isLoading = false
}) => {
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysWithSlots = new Set(existingSlots.map(slot => slot.date)).size;
  const totalSlots = existingSlots.length;
  const availableSlots = existingSlots.filter(slot => slot.is_available).length;

  const getStatusIcon = () => {
    if (totalSlots === 0) return <Calendar className="w-5 h-5 text-gray-400" />;
    if (daysWithSlots === totalDays) return <CheckCircle className="w-5 h-5 text-green-600" />;
    return <AlertTriangle className="w-5 h-5 text-orange-500" />;
  };

  const getStatusMessage = () => {
    if (totalSlots === 0) {
      return "Aucun créneau n'existe pour cette période";
    }
    if (daysWithSlots === totalDays) {
      return "Période complètement configurée";
    }
    return "Période partiellement configurée";
  };

  const getAlertVariant = () => {
    if (totalSlots === 0) return "default";
    if (daysWithSlots === totalDays) return "default";
    return "default";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          État actuel de la période
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant={getAlertVariant()}>
          <Info className="h-4 w-4" />
          <AlertDescription>{getStatusMessage()}</AlertDescription>
        </Alert>

        {totalSlots > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalDays}</div>
              <div className="text-gray-600">Jours total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{daysWithSlots}</div>
              <div className="text-gray-600">Jours configurés</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{totalSlots}</div>
              <div className="text-gray-600">Créneaux total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{availableSlots}</div>
              <div className="text-gray-600">Disponibles</div>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p>
            Période : {format(startDate, 'dd MMM yyyy', { locale: fr })} - {format(endDate, 'dd MMM yyyy', { locale: fr })}
          </p>
        </div>

        {totalSlots > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            <Button
              onClick={onReplace}
              variant="destructive"
              className="flex-1"
              disabled={isLoading}
            >
              Remplacer tous les créneaux
            </Button>
            <Button
              onClick={onComplete}
              variant="default"
              className="flex-1"
              disabled={isLoading}
            >
              Compléter les créneaux manquants
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              Annuler
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExistingSlotsPreview;
