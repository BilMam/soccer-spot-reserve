
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface TimeExclusion {
  date: Date;
  startTime: string;
  endTime: string;
  reason?: string;
}

interface SlotSummaryProps {
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  slotDuration: number;
  excludeDays: number[];
  timeExclusions: TimeExclusion[];
  totalSlots: number;
}

const SlotSummary: React.FC<SlotSummaryProps> = ({
  startDate,
  endDate,
  startTime,
  endTime,
  slotDuration,
  excludeDays,
  timeExclusions,
  totalSlots
}) => {
  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h4 className="font-medium text-blue-800 mb-2">Résumé de la création</h4>
      <div className="space-y-2 text-sm text-blue-700">
        <div className="flex justify-between">
          <span>Période :</span>
          <span>{startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Horaires :</span>
          <span>{startTime} - {endTime}</span>
        </div>
        <div className="flex justify-between">
          <span>Durée des créneaux :</span>
          <span>{slotDuration} minutes</span>
        </div>
        <div className="flex justify-between">
          <span>Jours exclus :</span>
          <span>{excludeDays.length > 0 ? `${excludeDays.length} jour(s)` : 'Aucun'}</span>
        </div>
        <div className="flex justify-between">
          <span>Exclusions horaires :</span>
          <span>{timeExclusions.length > 0 ? `${timeExclusions.length} plage(s)` : 'Aucune'}</span>
        </div>
        <div className="flex justify-between font-medium border-t pt-2">
          <span>Total créneaux estimés :</span>
          <Badge variant="secondary">{totalSlots}</Badge>
        </div>
      </div>
    </div>
  );
};

export default SlotSummary;
