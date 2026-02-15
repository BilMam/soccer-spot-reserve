
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TimeExclusionManager from './TimeExclusionManager';
import BasicConfigurationForm from './BasicConfigurationForm';
import DaySelectionForm, { DaySpecificTime } from './DaySelectionForm';
import SlotSummary from './SlotSummary';

interface TimeExclusion {
  date: Date;
  startTime: string;
  endTime: string;
  reason?: string;
}

interface FormData {
  startTime: string;
  endTime: string;
  slotDuration: number;
  excludeDays: number[];
  daySpecificTimes?: DaySpecificTime[];
}

interface SlotCreationFormContentProps {
  formData: FormData;
  timeExclusions: TimeExclusion[];
  startDate: Date;
  endDate: Date;
  totalSlots: number;
  onFormDataChange: (formData: FormData) => void;
  onTimeExclusionsChange: (exclusions: TimeExclusion[]) => void;
}

const SlotCreationFormContent: React.FC<SlotCreationFormContentProps> = ({
  formData,
  timeExclusions,
  startDate,
  endDate,
  totalSlots,
  onFormDataChange,
  onTimeExclusionsChange
}) => {
  const handleDayToggle = (dayValue: number, checked: boolean) => {
    const newExcludeDays = checked 
      ? formData.excludeDays.filter(d => d !== dayValue)
      : [...formData.excludeDays, dayValue];
    
    onFormDataChange({
      ...formData,
      excludeDays: newExcludeDays
    });
  };

  const handleDaySpecificTimesChange = (times: DaySpecificTime[]) => {
    onFormDataChange({
      ...formData,
      daySpecificTimes: times
    });
  };

  const handleDaySpecificTimeChange = (dayValue: number, startTime: string | null, endTime: string | null) => {
    let newDaySpecificTimes = [...(formData.daySpecificTimes || [])];
    
    if (startTime === null && endTime === null) {
      // Supprime les horaires spécifiques pour ce jour
      newDaySpecificTimes = newDaySpecificTimes.filter(d => d.dayOfWeek !== dayValue);
    } else {
      // Ajoute ou met à jour les horaires spécifiques
      const existingIndex = newDaySpecificTimes.findIndex(d => d.dayOfWeek === dayValue);
      const newEntry = { dayOfWeek: dayValue, startTime: startTime!, endTime: endTime! };
      
      if (existingIndex >= 0) {
        newDaySpecificTimes[existingIndex] = newEntry;
      } else {
        newDaySpecificTimes.push(newEntry);
      }
    }
    
    onFormDataChange({
      ...formData,
      daySpecificTimes: newDaySpecificTimes
    });
  };

  return (
    <>
      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Configuration de base</TabsTrigger>
          <TabsTrigger value="advanced">Exclusions avancées</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <BasicConfigurationForm
            startTime={formData.startTime}
            endTime={formData.endTime}
            slotDuration={formData.slotDuration}
            onStartTimeChange={(time) => onFormDataChange({ ...formData, startTime: time })}
            onEndTimeChange={(time) => onFormDataChange({ ...formData, endTime: time })}
            onSlotDurationChange={(duration) => onFormDataChange({ ...formData, slotDuration: duration })}
            onToggle24h={(start, end) => onFormDataChange({ ...formData, startTime: start, endTime: end })}
          />

          <DaySelectionForm
            excludeDays={formData.excludeDays}
            onDayToggle={handleDayToggle}
            daySpecificTimes={formData.daySpecificTimes}
            onDaySpecificTimeChange={handleDaySpecificTimeChange}
            globalStartTime={formData.startTime}
            globalEndTime={formData.endTime}
          />
        </TabsContent>

        <TabsContent value="advanced">
          <TimeExclusionManager
            startDate={startDate}
            endDate={endDate}
            exclusions={timeExclusions}
            onExclusionsChange={onTimeExclusionsChange}
          />
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <SlotSummary
          startDate={startDate}
          endDate={endDate}
          startTime={formData.startTime}
          endTime={formData.endTime}
          slotDuration={formData.slotDuration}
          excludeDays={formData.excludeDays}
          timeExclusions={timeExclusions}
          totalSlots={totalSlots}
          daySpecificTimes={formData.daySpecificTimes}
        />
      </div>
    </>
  );
};

export default SlotCreationFormContent;
