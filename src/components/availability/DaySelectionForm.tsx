
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

interface DaySelectionFormProps {
  excludeDays: number[];
  onDayToggle: (dayValue: number, checked: boolean) => void;
}

const DaySelectionForm: React.FC<DaySelectionFormProps> = ({
  excludeDays,
  onDayToggle
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
    <div className="space-y-4">
      <h4 className="font-medium">Jours d'ouverture</h4>
      <p className="text-sm text-gray-600">
        Décochez les jours où votre terrain sera fermé toute la journée
      </p>
      
      <div className="space-y-2">
        {daysOfWeek.map((day) => {
          const isExcluded = excludeDays.includes(day.value);
          return (
            <div key={day.value} className="flex items-center space-x-2">
              <Checkbox
                id={`day-${day.value}`}
                checked={!isExcluded}
                onCheckedChange={(checked) => onDayToggle(day.value, !!checked)}
              />
              <label
                htmlFor={`day-${day.value}`}
                className={`text-sm ${isExcluded ? 'text-gray-400 line-through' : 'text-gray-700'}`}
              >
                {day.label}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DaySelectionForm;
