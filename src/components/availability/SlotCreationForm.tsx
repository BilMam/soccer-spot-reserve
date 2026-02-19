import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { useAvailabilityManagement } from '@/hooks/useAvailabilityManagement';
import { useExistingSlots } from '@/hooks/useExistingSlots';
import { extractSlotConfiguration } from '@/utils/slotConfigExtractor';
import ExistingSlotsPreview from './ExistingSlotsPreview';
import SlotCreationSuccess from './SlotCreationSuccess';
import SlotCreationFormHeader from './SlotCreationFormHeader';
import SlotCreationFormContent from './SlotCreationFormContent';
import SlotCreationFormActions from './SlotCreationFormActions';
import SlotCreationFormLoading from './SlotCreationFormLoading';
import { DaySpecificTime } from './DaySelectionForm';
import { toast } from 'sonner';

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
  const { createAvailabilityWithDaySpecificTimes } = useAvailabilityManagement(fieldId);
  const { data: existingSlots = [], isLoading: checkingExisting, refetch } = useExistingSlots(fieldId, startDate, endDate);
  
  const [formData, setFormData] = useState({
    startTime: '08:00',
    endTime: '22:00',
    slotDuration: 30,
    excludeDays: [] as number[],
    daySpecificTimes: [] as DaySpecificTime[] | undefined
  });
  const [timeExclusions, setTimeExclusions] = useState<TimeExclusion[]>([]);
  const [creationStep, setCreationStep] = useState<'preview' | 'creating' | 'success' | 'modify'>('preview');
  const [slotsCreatedCount, setSlotsCreatedCount] = useState(0);

  // Extraire la configuration actuelle quand on passe en mode modification
  useEffect(() => {
    if (creationStep === 'modify' && existingSlots.length > 0) {
      const extractedConfig = extractSlotConfiguration(existingSlots);
      setFormData({
        ...extractedConfig,
        daySpecificTimes: extractedConfig.daySpecificTimes || []
      });
      console.log('Configuration extraite des créneaux existants:', extractedConfig);
    }
  }, [creationStep, existingSlots]);

  // Fonction utilitaire pour convertir heure en minutes (gardée pour compatibilité)
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const calculateTotalSlots = () => {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    let totalSlots = 0;
    
    // Parcourir chaque jour de la période
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dayOfWeek = currentDate.getDay();
      
      // Ignorer les jours exclus
      if (formData.excludeDays.includes(dayOfWeek)) continue;
      
      // Trouver les horaires pour ce jour
      const specificTime = formData.daySpecificTimes?.find(d => d.dayOfWeek === dayOfWeek);
      const dayStart = specificTime?.startTime || formData.startTime;
      const dayEnd = specificTime?.endTime || formData.endTime;
      
      // Calculer les créneaux pour ce jour
      // '00:00' comme endTime = minuit fin de journée = 1440 minutes
      const startMinutes = parseInt(dayStart.split(':')[0]) * 60 + parseInt(dayStart.split(':')[1]);
      const rawEndMinutes = parseInt(dayEnd.split(':')[0]) * 60 + parseInt(dayEnd.split(':')[1]);
      const endMinutes = (rawEndMinutes === 0 && startMinutes >= 0) ? 1440 : rawEndMinutes;
      const slotsForDay = Math.floor((endMinutes - startMinutes) / formData.slotDuration);
      
      totalSlots += slotsForDay;
    }
    
    // Soustraire les exclusions horaires spécifiques
    const excludedSlots = timeExclusions.reduce((total, exclusion) => {
      const excStartMinutes = parseInt(exclusion.startTime.split(':')[0]) * 60 + parseInt(exclusion.startTime.split(':')[1]);
      const excEndMinutes = parseInt(exclusion.endTime.split(':')[0]) * 60 + parseInt(exclusion.endTime.split(':')[1]);
      const excludedSlotsForDay = Math.floor((excEndMinutes - excStartMinutes) / formData.slotDuration);
      return total + excludedSlotsForDay;
    }, 0);
    
    return Math.max(0, totalSlots - excludedSlots);
  };

  const handleCreateSlots = async () => {
    try {
      setCreationStep('creating');

      const startDateISO = format(startDate, 'yyyy-MM-dd');
      const endDateISO = format(endDate, 'yyyy-MM-dd');

      // Construire le tableau des créneaux à créer
      const slotsToCreate: Array<{ dayOfWeek: number; start: string; end: string }> = [];

      for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
        // Ignorer les jours exclus
        if (formData.excludeDays.includes(dayOfWeek)) {
          console.log(`⏭️ Jour ${dayOfWeek} exclu, skip`);
          continue;
        }

        // Trouver les horaires spécifiques pour ce jour
        const specific = formData.daySpecificTimes?.find(d => d.dayOfWeek === dayOfWeek);
        const start = specific?.startTime || formData.startTime;
        const end = specific?.endTime || formData.endTime;

        slotsToCreate.push({ dayOfWeek, start, end });
        
        const dayName = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][dayOfWeek];
        console.log(`📅 ${dayName} (${dayOfWeek}): ${start}-${end}`);
      }

      console.log('🚀 Appel RPC unique avec:', slotsToCreate);

      // Un seul appel RPC pour créer tous les créneaux
      const totalSlotsCreated = await createAvailabilityWithDaySpecificTimes.mutateAsync({
        startDate: startDateISO,
        endDate: endDateISO,
        slotDuration: formData.slotDuration,
        slotsToCreate
      });

      console.log(`🎉 Total : ${totalSlotsCreated} créneaux créés`);

      setSlotsCreatedCount(totalSlotsCreated);
      setCreationStep('success');
      refetch();
      onSlotsCreated?.(totalSlotsCreated);
    } catch (error) {
      console.error('❌ Erreur création créneaux:', error);
      toast.error('Erreur lors de la création des créneaux');
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
      excludeDays: [],
      daySpecificTimes: []
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
          onFormDataChange={(newData) => setFormData({ ...newData, daySpecificTimes: newData.daySpecificTimes || [] })}
          onTimeExclusionsChange={setTimeExclusions}
        />
        
        <SlotCreationFormActions
          isCreating={createAvailabilityWithDaySpecificTimes.isPending || creationStep === 'creating'}
          isModifying={creationStep === 'modify'}
          onCreateSlots={handleCreateSlots}
        />
      </CardContent>
    </Card>
  );
};

export default SlotCreationForm;
