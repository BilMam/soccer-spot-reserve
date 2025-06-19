
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateTimeOptions, timeToMinutes, minutesToTime } from '@/utils/timeUtils';
import { SlotStatusUtils, fetchBookedSlots } from './SlotStatusUtils';
import { AvailableEndTimesCalculator } from './AvailableEndTimesCalculator';
import SlotStatusBadge from './SlotStatusBadge';

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
  fieldId: string;
}

const TimeSlotSelector: React.FC<TimeSlotSelectorProps> = ({
  selectedStartTime,
  selectedEndTime,
  onStartTimeChange,
  onEndTimeChange,
  availableSlots,
  fieldId
}) => {
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const timeOptions = generateTimeOptions();

  console.log('🔍 TimeSlotSelector - Field ID reçu:', fieldId);
  console.log('🔍 TimeSlotSelector - Créneaux disponibles:', availableSlots.length);

  // Récupérer les créneaux réservés
  useEffect(() => {
    const fetchSlots = async () => {
      if (availableSlots.length === 0 || !fieldId) {
        console.log('🔍 Pas de créneaux ou pas de fieldId, skip fetch');
        return;
      }
      
      const dateStr = availableSlots[0]?.date;
      if (!dateStr) {
        console.log('🔍 Pas de date trouvée dans les créneaux');
        return;
      }

      const slots = await fetchBookedSlots(fieldId, dateStr);
      setBookedSlots(slots);
    };

    fetchSlots();
  }, [availableSlots, fieldId]);

  // Initialize utility classes
  const slotStatusUtils = new SlotStatusUtils(availableSlots, bookedSlots);
  const endTimesCalculator = new AvailableEndTimesCalculator(slotStatusUtils);

  const availableEndTimes = endTimesCalculator.getAvailableEndTimes(selectedStartTime);

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
              const status = slotStatusUtils.getSlotStatus(time, nextTime);
              const isDisabled = status !== 'available';
              
              return (
                <SelectItem key={time} value={time} disabled={isDisabled} className="flex items-center justify-between">
                  <div className="flex items-center justify-between w-full">
                    <span>{time}</span>
                    <SlotStatusBadge status={status} />
                  </div>
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
