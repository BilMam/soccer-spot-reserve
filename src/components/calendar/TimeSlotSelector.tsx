
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { generateTimeOptions, timeToMinutes, minutesToTime } from '@/utils/timeUtils';

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  price_override?: number;
  unavailability_reason?: string;
  is_maintenance?: boolean;
  notes?: string;
}

interface TimeSlotSelectorProps {
  selectedStartTime: string;
  selectedEndTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  availableSlots: AvailabilitySlot[];
}

const TimeSlotSelector: React.FC<TimeSlotSelectorProps> = ({
  selectedStartTime,
  selectedEndTime,
  onStartTimeChange,
  onEndTimeChange,
  availableSlots
}) => {
  const timeOptions = generateTimeOptions();

  const getAvailableEndTimes = (startTime: string): string[] => {
    if (!startTime) return [];
    const startMinutes = timeToMinutes(startTime);
    const availableEndTimes: string[] = [];

    for (let minutes = startMinutes + 30; minutes <= timeToMinutes('22:00'); minutes += 30) {
      const endTime = minutesToTime(minutes);
      
      if (isRangeAvailable(startTime, endTime)) {
        availableEndTimes.push(endTime);
      } else {
        break;
      }
    }
    return availableEndTimes;
  };

  const isRangeAvailable = (startTime: string, endTime: string): boolean => {
    if (!startTime || !endTime) return false;
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const slotStartTime = minutesToTime(minutes);
      const slotEndTime = minutesToTime(minutes + 30);
      const slot = availableSlots.find(s => s.start_time === slotStartTime && s.end_time === slotEndTime);
      if (!slot || !slot.is_available) {
        return false;
      }
    }
    return true;
  };

  const availableEndTimes = getAvailableEndTimes(selectedStartTime);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Heure de début
        </label>
        <Select value={selectedStartTime} onValueChange={onStartTimeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir l'heure" />
          </SelectTrigger>
          <SelectContent>
            {timeOptions.slice(0, -1).map(time => {
              const nextTime = minutesToTime(timeToMinutes(time) + 30);
              const isSlotAvailable = availableSlots.find(s => s.start_time === time && s.end_time === nextTime)?.is_available;
              return (
                <SelectItem key={time} value={time} disabled={!isSlotAvailable} className="flex items-center justify-between">
                  <span>{time}</span>
                  {!isSlotAvailable && (
                    <Badge variant="secondary" className="ml-2 text-xs bg-gray-200 text-gray-600">
                      Occupé
                    </Badge>
                  )}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Heure de fin
        </label>
        <Select value={selectedEndTime} onValueChange={onEndTimeChange} disabled={!selectedStartTime}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir l'heure" />
          </SelectTrigger>
          <SelectContent>
            {availableEndTimes.map(time => (
              <SelectItem key={time} value={time}>
                {time}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default TimeSlotSelector;
