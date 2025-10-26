
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Clock, X } from 'lucide-react';

export interface DaySpecificTime {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface DaySelectionFormProps {
  excludeDays: number[];
  onDayToggle: (dayValue: number, checked: boolean) => void;
  daySpecificTimes?: DaySpecificTime[];
  onDaySpecificTimeChange?: (dayValue: number, startTime: string | null, endTime: string | null) => void;
  globalStartTime: string;
  globalEndTime: string;
}

const DaySelectionForm: React.FC<DaySelectionFormProps> = ({
  excludeDays,
  onDayToggle,
  daySpecificTimes = [],
  onDaySpecificTimeChange,
  globalStartTime,
  globalEndTime
}) => {
  const daysOfWeek = [
    { value: 0, label: 'Dimanche', shortLabel: 'Dim' },
    { value: 1, label: 'Lundi', shortLabel: 'Lun' },
    { value: 2, label: 'Mardi', shortLabel: 'Mar' },
    { value: 3, label: 'Mercredi', shortLabel: 'Mer' },
    { value: 4, label: 'Jeudi', shortLabel: 'Jeu' },
    { value: 5, label: 'Vendredi', shortLabel: 'Ven' },
    { value: 6, label: 'Samedi', shortLabel: 'Sam' }
  ];

  console.log('📅 DaySelectionForm - Jours exclus actuels:', excludeDays);

  const handleDayToggle = (dayValue: number, checked: boolean) => {
    console.log(`📅 Toggle jour ${dayValue} (${daysOfWeek[dayValue].label}): ${checked ? 'inclus' : 'exclu'}`);
    onDayToggle(dayValue, checked);
  };

  const hasSpecificTimes = (dayValue: number) => {
    return daySpecificTimes.some(d => d.dayOfWeek === dayValue);
  };

  const getSpecificTime = (dayValue: number, type: 'start' | 'end') => {
    const specific = daySpecificTimes.find(d => d.dayOfWeek === dayValue);
    if (specific) {
      return type === 'start' ? specific.startTime : specific.endTime;
    }
    return type === 'start' ? globalStartTime : globalEndTime;
  };

  const toggleSpecificTimes = (dayValue: number) => {
    if (hasSpecificTimes(dayValue)) {
      onDaySpecificTimeChange?.(dayValue, null, null);
    } else {
      onDaySpecificTimeChange?.(dayValue, globalStartTime, globalEndTime);
    }
  };

  const handleSpecificTimeChange = (dayValue: number, start: string | null, end: string | null) => {
    const current = daySpecificTimes.find(d => d.dayOfWeek === dayValue);
    const newStart = start !== null ? start : (current?.startTime || globalStartTime);
    const newEnd = end !== null ? end : (current?.endTime || globalEndTime);
    onDaySpecificTimeChange?.(dayValue, newStart, newEnd);
  };

  const removeSpecificTimes = (dayValue: number) => {
    onDaySpecificTimeChange?.(dayValue, null, null);
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium">Jours d'ouverture</h4>
      <p className="text-sm text-gray-600">
        Décochez les jours où votre terrain sera fermé toute la journée
      </p>
      
      <div className="space-y-2">
        {daysOfWeek.map((day) => {
          const isExcluded = excludeDays.includes(day.value);
          const hasSpecific = hasSpecificTimes(day.value);
          return (
            <div key={day.value} className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`day-${day.value}`}
                  checked={!isExcluded}
                  onCheckedChange={(checked) => handleDayToggle(day.value, !!checked)}
                />
                <label
                  htmlFor={`day-${day.value}`}
                  className={`text-sm font-medium flex-1 ${isExcluded ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                >
                  {day.label} ({day.shortLabel}) - Jour {day.value}
                </label>
                
                {!isExcluded && (
                  <button
                    type="button"
                    onClick={() => toggleSpecificTimes(day.value)}
                    className={`p-1 transition-colors ${hasSpecific ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}
                    title="Horaires spécifiques"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                )}
                
                {isExcluded && (
                  <span className="text-xs text-red-500 ml-2 font-medium">
                    [Exclu - aucun créneau ne sera créé]
                  </span>
                )}
              </div>
              
              {!isExcluded && hasSpecific && (
                <div className="flex items-center gap-2 ml-6 animate-in slide-in-from-left">
                  <Input
                    type="time"
                    value={getSpecificTime(day.value, 'start')}
                    onChange={(e) => handleSpecificTimeChange(day.value, e.target.value, null)}
                    className="w-24 h-8 text-xs"
                  />
                  <span className="text-xs text-gray-500">→</span>
                  <Input
                    type="time"
                    value={getSpecificTime(day.value, 'end')}
                    onChange={(e) => handleSpecificTimeChange(day.value, null, e.target.value)}
                    className="w-24 h-8 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpecificTimes(day.value)}
                    className="text-red-400 hover:text-red-600 p-1 transition-colors"
                    title="Supprimer horaires spécifiques"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {excludeDays.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800 font-medium">
            <strong>Jours exclus :</strong> {excludeDays.map(day => daysOfWeek[day].label).join(', ')}
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Aucun créneau ne sera créé pour ces jours dans la période sélectionnée.
          </p>
        </div>
      )}
    </div>
  );
};

export default DaySelectionForm;
