
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TimeExclusionManager from './TimeExclusionManager';
import BasicConfigurationForm from './BasicConfigurationForm';
import DaySelectionForm from './DaySelectionForm';
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
          />

          <DaySelectionForm
            excludeDays={formData.excludeDays}
            onDayToggle={handleDayToggle}
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
        />
      </div>
    </>
  );
};

export default SlotCreationFormContent;
