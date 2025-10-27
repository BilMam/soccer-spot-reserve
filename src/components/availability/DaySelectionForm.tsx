import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Clock, Check, X } from 'lucide-react';

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
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [tempStartTime, setTempStartTime] = useState<string>('');
  const [tempEndTime, setTempEndTime] = useState<string>('');

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

  const hasSpecificTime = (dayValue: number) => {
    return daySpecificTimes.some(dst => dst.dayOfWeek === dayValue);
  };

  const getSpecificTime = (dayValue: number) => {
    return daySpecificTimes.find(dst => dst.dayOfWeek === dayValue);
  };

  const handleStartEdit = (dayValue: number) => {
    const existing = getSpecificTime(dayValue);
    if (existing) {
      setTempStartTime(existing.startTime);
      setTempEndTime(existing.endTime);
    } else {
      setTempStartTime(globalStartTime);
      setTempEndTime(globalEndTime);
    }
    setEditingDay(dayValue);
  };

  const handleSaveEdit = (dayValue: number) => {
    if (!onDaySpecificTimeChange) return;
    
    onDaySpecificTimeChange(dayValue, tempStartTime, tempEndTime);
    setEditingDay(null);
    console.log(`✅ Horaires spécifiques sauvegardés pour jour ${dayValue}: ${tempStartTime}-${tempEndTime}`);
  };

  const handleCancelEdit = () => {
    setEditingDay(null);
    setTempStartTime('');
    setTempEndTime('');
  };

  const handleRemoveSpecificTime = (dayValue: number) => {
    if (!onDaySpecificTimeChange) return;
    
    onDaySpecificTimeChange(dayValue, null, null);
    setEditingDay(null);
    console.log(`❌ Horaires spécifiques supprimés pour jour ${dayValue}`);
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium">Jours d'ouverture</h4>
      <p className="text-sm text-muted-foreground">
        Décochez les jours où votre terrain sera fermé. Cliquez sur <Clock className="inline h-3 w-3" /> pour des horaires spécifiques.
      </p>
      
      <div className="space-y-3">
        {daysOfWeek.map((day) => {
          const isExcluded = excludeDays.includes(day.value);
          const specificTime = getSpecificTime(day.value);
          const isEditing = editingDay === day.value;
          
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
                  className={`text-sm font-medium flex-1 ${isExcluded ? 'text-muted-foreground line-through' : ''}`}
                >
                  {day.label}
                </label>
                
                {!isExcluded && onDaySpecificTimeChange && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartEdit(day.value)}
                    className={`h-8 px-2 ${hasSpecificTime(day.value) ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                )}
                
                {isExcluded && (
                  <span className="text-xs text-destructive font-medium">
                    Fermé
                  </span>
                )}
                
                {!isExcluded && specificTime && !isEditing && (
                  <span className="text-xs text-primary font-medium">
                    {specificTime.startTime} - {specificTime.endTime}
                  </span>
                )}
              </div>
              
              {isEditing && !isExcluded && (
                <div className="ml-6 flex items-center gap-2 p-3 bg-muted/50 rounded-md border">
                  <Input
                    type="time"
                    value={tempStartTime}
                    onChange={(e) => setTempStartTime(e.target.value)}
                    className="h-8 w-24"
                  />
                  <span className="text-sm text-muted-foreground">→</span>
                  <Input
                    type="time"
                    value={tempEndTime}
                    onChange={(e) => setTempEndTime(e.target.value)}
                    className="h-8 w-24"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSaveEdit(day.value)}
                    className="h-8 px-2"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-8 px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  {hasSpecificTime(day.value) && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveSpecificTime(day.value)}
                      className="h-8 px-2 ml-auto"
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {excludeDays.length > 0 && (
        <div className="mt-4 p-3 bg-warning/10 border border-warning rounded-md">
          <p className="text-sm text-warning-foreground font-medium">
            <strong>Jours fermés :</strong> {excludeDays.map(day => daysOfWeek[day].label).join(', ')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Aucun créneau ne sera créé pour ces jours.
          </p>
        </div>
      )}
    </div>
  );
};

export default DaySelectionForm;
