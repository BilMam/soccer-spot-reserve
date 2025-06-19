
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Save } from 'lucide-react';
import { useAvailabilityManagement } from '@/hooks/useAvailabilityManagement';
import TimeExclusionManager from './TimeExclusionManager';
import BasicConfigurationForm from './BasicConfigurationForm';
import DaySelectionForm from './DaySelectionForm';
import SlotSummary from './SlotSummary';

interface SlotCreationFormProps {
  fieldId: string;
  startDate: Date;
  endDate: Date;
  onSlotsCreated?: () => void;
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
  onSlotsCreated
}) => {
  const { createAvailabilityForPeriod } = useAvailabilityManagement(fieldId);
  const [formData, setFormData] = useState({
    startTime: '08:00',
    endTime: '22:00',
    slotDuration: 30,
    excludeDays: [] as number[]
  });
  const [timeExclusions, setTimeExclusions] = useState<TimeExclusion[]>([]);

  const handleDayToggle = (dayValue: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      excludeDays: checked 
        ? prev.excludeDays.filter(d => d !== dayValue)
        : [...prev.excludeDays, dayValue]
    }));
  };

  const calculateTotalSlots = () => {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const activeDays = days - Math.floor(days / 7) * formData.excludeDays.length;
    
    const startMinutes = parseInt(formData.startTime.split(':')[0]) * 60 + parseInt(formData.startTime.split(':')[1]);
    const endMinutes = parseInt(formData.endTime.split(':')[0]) * 60 + parseInt(formData.endTime.split(':')[1]);
    const slotsPerDay = Math.floor((endMinutes - startMinutes) / formData.slotDuration);
    
    // Décompter les exclusions horaires
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
      await createAvailabilityForPeriod.mutateAsync({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        startTime: formData.startTime,
        endTime: formData.endTime,
        slotDuration: formData.slotDuration,
        excludeDays: formData.excludeDays,
        timeExclusions: timeExclusions
      });
      
      onSlotsCreated?.();
    } catch (error) {
      console.error('Erreur lors de la création des créneaux:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Créer les créneaux pour la période
        </CardTitle>
      </CardHeader>
      <CardContent>
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
              onStartTimeChange={(time) => setFormData(prev => ({ ...prev, startTime: time }))}
              onEndTimeChange={(time) => setFormData(prev => ({ ...prev, endTime: time }))}
              onSlotDurationChange={(duration) => setFormData(prev => ({ ...prev, slotDuration: duration }))}
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
              onExclusionsChange={setTimeExclusions}
            />
          </TabsContent>
        </Tabs>

        {/* Résumé */}
        <div className="mt-6">
          <SlotSummary
            startDate={startDate}
            endDate={endDate}
            startTime={formData.startTime}
            endTime={formData.endTime}
            slotDuration={formData.slotDuration}
            excludeDays={formData.excludeDays}
            timeExclusions={timeExclusions}
            totalSlots={calculateTotalSlots()}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          <Button 
            onClick={handleCreateSlots}
            disabled={createAvailabilityForPeriod.isPending}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            {createAvailabilityForPeriod.isPending ? 'Création...' : 'Créer les créneaux'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SlotCreationForm;
