
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateTimeOptions } from '@/utils/timeUtils';

interface TimeSlotSelectorProps {
  value: string;
  onChange: (timeSlot: string) => void;
  selectedDate?: string;
  placeholder?: string;
}

const TimeSlotSelector: React.FC<TimeSlotSelectorProps> = ({
  value,
  onChange,
  selectedDate,
  placeholder = 'Horaire'
}) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [open, setOpen] = useState(false);
  
  const timeOptions = generateTimeOptions();
  
  // Filter out past times if selected date is today
  const getAvailableStartTimes = () => {
    if (!selectedDate) return timeOptions.slice(0, -1);
    
    const today = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === today;
    
    if (!isToday) return timeOptions.slice(0, -1);
    
    // If today, filter out past times
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    return timeOptions.slice(0, -1).filter(time => {
      const [hours, minutes] = time.split(':').map(Number);
      const timeMinutes = hours * 60 + minutes;
      return timeMinutes > currentMinutes;
    });
  };

  // Parse existing value when component mounts or value changes
  useEffect(() => {
    if (value && value.includes('-')) {
      const [start, end] = value.split('-');
      if (start && end) {
        // Convert "14h00" to "14:00" format for selects
        const normalizedStart = start.replace('h', ':').padEnd(5, '0');
        const normalizedEnd = end.replace('h', ':').padEnd(5, '0');
        setStartTime(normalizedStart);
        setEndTime(normalizedEnd);
      }
    } else if (!value) {
      setStartTime('');
      setEndTime('');
    }
  }, [value]);

  // Filter end time options based on start time
  const getAvailableEndTimes = () => {
    if (!startTime) return [];
    
    const startIndex = timeOptions.findIndex(time => time === startTime);
    if (startIndex === -1) return [];
    
    // Return times after start time (minimum 30 minutes)
    return timeOptions.slice(startIndex + 1);
  };

  // Update timeSlot when start or end time changes
  useEffect(() => {
    if (startTime && endTime) {
      // Convert back to "14h00-16h00" format
      const formatTime = (time: string) => time.replace(':', 'h');
      const timeSlot = `${formatTime(startTime)}-${formatTime(endTime)}`;
      onChange(timeSlot);
    } else {
      onChange('');
    }
  }, [startTime, endTime, onChange]);

  const handleStartTimeChange = (time: string) => {
    setStartTime(time);
    // Reset end time if it's not valid anymore
    const availableEndTimes = timeOptions.slice(timeOptions.findIndex(t => t === time) + 1);
    if (endTime && !availableEndTimes.includes(endTime)) {
      setEndTime('');
    }
  };

  const displayValue = () => {
    if (startTime && endTime) {
      const formatTime = (time: string) => time.replace(':', 'h');
      return `${formatTime(startTime)} - ${formatTime(endTime)}`;
    }
    return placeholder;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal border-gray-200 focus:border-green-500"
        >
          <Clock className="w-4 h-4 mr-2" />
          {displayValue()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-700 mb-3">
            Sélectionnez votre horaire
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Début
              </label>
              <Select value={startTime} onValueChange={handleStartTimeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Heure" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableStartTimes().map(time => (
                    <SelectItem key={time} value={time}>
                      {time.replace(':', 'h')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fin
              </label>
              <Select 
                value={endTime} 
                onValueChange={setEndTime}
                disabled={!startTime}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Heure" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableEndTimes().map(time => (
                    <SelectItem key={time} value={time}>
                      {time.replace(':', 'h')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>


          <div className="flex justify-end space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartTime('');
                setEndTime('');
              }}
            >
              Effacer
            </Button>
            <Button
              size="sm"
              onClick={() => setOpen(false)}
              disabled={!startTime || !endTime}
            >
              Valider
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TimeSlotSelector;
