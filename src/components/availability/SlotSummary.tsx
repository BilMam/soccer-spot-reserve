
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface TimeExclusion {
  date: Date;
  startTime: string;
  endTime: string;
  reason?: string;
}

interface DaySpecificTime {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
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
  daySpecificTimes?: DaySpecificTime[];
}

const SlotSummary: React.FC<SlotSummaryProps> = ({
  startDate,
  endDate,
  startTime,
  endTime,
  slotDuration,
  excludeDays,
  timeExclusions,
  totalSlots,
  daySpecificTimes = []
}) => {
  const daysOfWeek = [
    { value: 0, label: 'Dimanche' },
    { value: 1, label: 'Lundi' },
    { value: 2, label: 'Mardi' },
    { value: 3, label: 'Mercredi' },
    { value: 4, label: 'Jeudi' },
    { value: 5, label: 'Vendredi' },
    { value: 6, label: 'Samedi' }
  ];

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
          <span>
            {startTime === '00:00' && (endTime === '00:00' || endTime === '23:30')
              ? '24h/24 (00:00 - minuit)'
              : `${startTime} - ${endTime}`}
          </span>
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
        {daySpecificTimes.length > 0 && (
          <div className="border-t pt-2 mt-2">
            <p className="text-xs font-medium text-blue-800 mb-1">
              Horaires personnalisés :
            </p>
            <div className="space-y-1">
              {daySpecificTimes.map(dst => (
                <p key={dst.dayOfWeek} className="text-xs text-blue-700">
                  • {daysOfWeek[dst.dayOfWeek].label} : {dst.startTime} - {dst.endTime}
                </p>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-between font-medium border-t pt-2">
          <span>Total créneaux estimés :</span>
          <Badge variant="secondary">{totalSlots}</Badge>
        </div>
      </div>
    </div>
  );
};

export default SlotSummary;
