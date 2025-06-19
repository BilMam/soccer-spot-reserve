
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAvailabilityManagement } from '@/hooks/useAvailabilityManagement';
import { useExistingSlots } from '@/hooks/useExistingSlots';
import ExistingSlotsPreview from './ExistingSlotsPreview';
import SlotCreationSuccess from './SlotCreationSuccess';
import SlotCreationFormHeader from './SlotCreationFormHeader';
import SlotCreationFormContent from './SlotCreationFormContent';
import SlotCreationFormActions from './SlotCreationFormActions';
import SlotCreationFormLoading from './SlotCreationFormLoading';

interface SlotCreationFormProps {
  fieldId: string;
  startDate: Date;
  endDate: Date;
  onSlotsCreated?: (slotsCount: number) => void;
  onViewCalendar?: () => void;
}

interface TimeExclusion {
  date: Date;
  startTime: string;
  endTime: string;
  reason?: string;
}

const SlotCreationForm: React.FC<SlotCreationFormProps> = ({
  fieldId,
  startDate,
  endDate,
  onSlotsCreated,
  onViewCalendar
}) => {
  const { createAvailabilityForPeriod } = useAvailabilityManagement(fieldId);
  const { data: existingSlots = [], isLoading: checkingExisting, refetch } = useExistingSlots(fieldId, startDate, endDate);
  
  const [formData, setFormData] = useState({
    startTime: '08:00',
    endTime: '22:00',
    slotDuration: 30,
    excludeDays: [] as number[]
  });
  const [timeExclusions, setTimeExclusions] = useState<TimeExclusion[]>([]);
  const [creationStep, setCreationStep] = useState<'preview' | 'creating' | 'success' | 'modify'>('preview');
  const [slotsCreatedCount, setSlotsCreatedCount] = useState(0);

  const calculateTotalSlots = () => {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const activeDays = days - Math.floor(days / 7) * formData.excludeDays.length;
    
    const startMinutes = parseInt(formData.startTime.split(':')[0]) * 60 + parseInt(formData.startTime.split(':')[1]);
    const endMinutes = parseInt(formData.endTime.split(':')[0]) * 60 + parseInt(formData.endTime.split(':')[1]);
    const slotsPerDay = Math.floor((endMinutes - startMinutes) / formData.slotDuration);
    
    const excludedSlots = timeExclusions.reduce((total, exclusion) => {
      const excStartMinutes = parseInt(exclusion.startTime.split(':')[0]) * 60 + parseInt(exclusion.startTime.split(':')[1]);
      const excEndMinutes = parseInt(exclusion.endTime.split(':')[0]) * 60 + parseInt(exclusion.endTime.split(':')[1]);
      const excludedSlotsForDay = Math.floor((excEndMinutes - excStartMinutes) / formData.slotDuration);
      return total + excludedSlotsForDay;
    }, 0);
    
    return Math.max(0, (activeDays * slotsPerDay) - excludedSlots);
  };

  const handleCreateSlots = async () => {
    try {
      setCreationStep('creating');
      
      const result = await createAvailabilityForPeriod.mutateAsync({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        startTime: formData.startTime,
        endTime: formData.endTime,
        slotDuration: formData.slotDuration,
        excludeDays: formData.excludeDays,
        timeExclusions: timeExclusions
      });
      
      setSlotsCreatedCount(result || calculateTotalSlots());
      setCreationStep('success');
      refetch();
      onSlotsCreated?.(result || calculateTotalSlots());
    } catch (error) {
      console.error('Erreur lors de la création des créneaux:', error);
      setCreationStep('preview');
    }
  };

  const handleModify = () => {
    setCreationStep('modify');
  };

  const handleDelete = async () => {
    console.log('Suppression des créneaux...');
    refetch();
    setCreationStep('preview');
  };

  const handleCancel = () => {
    setCreationStep('preview');
  };

  const handleCreateNew = () => {
    setCreationStep('preview');
    setSlotsCreatedCount(0);
    setFormData({
      startTime: '08:00',
      endTime: '22:00',
      slotDuration: 30,
      excludeDays: []
    });
    setTimeExclusions([]);
  };

  const handleViewCalendar = () => {
    onViewCalendar?.();
  };

  if (checkingExisting) {
    return <SlotCreationFormLoading />;
  }

  if (creationStep === 'success') {
    return (
      <SlotCreationSuccess
        slotsCreated={slotsCreatedCount}
        startDate={startDate}
        endDate={endDate}
        onViewCalendar={handleViewCalendar}
        onCreateNew={handleCreateNew}
      />
    );
  }

  if (existingSlots.length > 0 && creationStep !== 'modify') {
    return (
      <ExistingSlotsPreview
        existingSlots={existingSlots}
        startDate={startDate}
        endDate={endDate}
        onModify={handleModify}
        onDelete={handleDelete}
        onViewCalendar={handleViewCalendar}
        onCancel={handleCancel}
        isLoading={creationStep === 'creating'}
      />
    );
  }

  return (
    <Card>
      <SlotCreationFormHeader isModifying={creationStep === 'modify'} />
      <CardContent>
        <SlotCreationFormContent
          formData={formData}
          timeExclusions={timeExclusions}
          startDate={startDate}
          endDate={endDate}
          totalSlots={calculateTotalSlots()}
          onFormDataChange={setFormData}
          onTimeExclusionsChange={setTimeExclusions}
        />
        
        <SlotCreationFormActions
          isCreating={createAvailabilityForPeriod.isPending || creationStep === 'creating'}
          isModifying={creationStep === 'modify'}
          onCreateSlots={handleCreateSlots}
        />
      </CardContent>
    </Card>
  );
};

export default SlotCreationForm;
