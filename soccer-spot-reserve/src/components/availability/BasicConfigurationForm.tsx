
import React from 'react';
import { Input } from '@/components/ui/input';

interface BasicConfigurationFormProps {
  startTime: string;
  endTime: string;
  slotDuration: number;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onSlotDurationChange: (duration: number) => void;
}

const BasicConfigurationForm: React.FC<BasicConfigurationFormProps> = ({
  startTime,
  endTime,
  slotDuration,
  onStartTimeChange,
  onEndTimeChange,
  onSlotDurationChange
}) => {
  return (
    <div className="space-y-4">
      <h4 className="font-medium">Horaires de disponibilité</h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Heure d'ouverture</label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Heure de fermeture</label>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Durée des créneaux (minutes)</label>
        <Input
          type="number"
          min="15"
          max="120"
          step="15"
          value={slotDuration}
          onChange={(e) => onSlotDurationChange(parseInt(e.target.value))}
        />
        <p className="text-xs text-gray-500 mt-1">
          Détermine la granularité des réservations (ex: 30min = créneaux de 30 minutes)
        </p>
      </div>
    </div>
  );
};

export default BasicConfigurationForm;
