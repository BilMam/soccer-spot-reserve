
import React from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Clock } from 'lucide-react';

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
  const is24h = startTime === '00:00' && endTime === '23:30';

  const handle24hToggle = (checked: boolean) => {
    if (checked) {
      onStartTimeChange('00:00');
      onEndTimeChange('23:30');
    } else {
      onStartTimeChange('08:00');
      onEndTimeChange('22:00');
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium">Horaires de disponibilité</h4>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Terrain ouvert 24h/24</span>
        </div>
        <Switch checked={is24h} onCheckedChange={handle24hToggle} />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Heure d'ouverture</label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            disabled={is24h}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Heure de fermeture</label>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            disabled={is24h}
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
        <p className="text-xs text-muted-foreground mt-1">
          Détermine la granularité des réservations (ex: 30min = créneaux de 30 minutes)
        </p>
      </div>
    </div>
  );
};

export default BasicConfigurationForm;
