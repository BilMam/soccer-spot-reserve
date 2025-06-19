
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
                onCheckedChange={(checked) => handleDayToggle(day.value, !!checked)}
              />
              <label
                htmlFor={`day-${day.value}`}
                className={`text-sm font-medium ${isExcluded ? 'text-gray-400 line-through' : 'text-gray-700'}`}
              >
                {day.label} ({day.shortLabel}) - Jour {day.value}
              </label>
              {isExcluded && (
                <span className="text-xs text-red-500 ml-2 font-medium">
                  [Exclu - aucun créneau ne sera créé]
                </span>
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
