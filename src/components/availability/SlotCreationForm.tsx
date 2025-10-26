import React, { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
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
  const { createAvailabilityForPeriod } = useAvailabilityManagement(fieldId);
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
      const startMinutes = parseInt(dayStart.split(':')[0]) * 60 + parseInt(dayStart.split(':')[1]);
      const endMinutes = parseInt(dayEnd.split(':')[0]) * 60 + parseInt(dayEnd.split(':')[1]);
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
      
      // Si en mode modification : supprimer les créneaux existants d'abord
      if (creationStep === 'modify' && existingSlots.length > 0) {
        console.log('Mode modification : suppression des créneaux existants...');
        
        const { error: deleteError } = await supabase
          .from('field_availability')
          .delete()
          .eq('field_id', fieldId)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);
        
        if (deleteError) {
          console.error('Erreur lors de la suppression:', deleteError);
          toast.error('Impossible de supprimer les anciens créneaux');
          setCreationStep('preview');
          return;
        }
        
        console.log('Créneaux existants supprimés avec succès');
      }
      
      // Gérer les horaires spécifiques par jour côté frontend
      if (formData.daySpecificTimes && formData.daySpecificTimes.length > 0) {
        console.log('Création avec horaires spécifiques par jour - traitement séquentiel...');
        let totalSlotsCreated = 0;
        
        // Créer une map pour accès rapide aux horaires spécifiques
        const specificTimesMap = new Map(
          formData.daySpecificTimes.map(dst => [dst.dayOfWeek, dst])
        );
        
        // Traiter chaque jour de la semaine séparément
        for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
          // Skip si le jour est exclu
          if (formData.excludeDays.includes(dayOfWeek)) {
            console.log(`Jour ${dayOfWeek} exclu, skip`);
            continue;
          }
          
          // Déterminer les horaires pour ce jour
          const specificTime = specificTimesMap.get(dayOfWeek);
          const startTime = specificTime ? specificTime.startTime : formData.startTime;
          const endTime = specificTime ? specificTime.endTime : formData.endTime;
          
          // Exclure tous les autres jours (ne créer que pour ce jour)
          const excludeDaysForThisDay = [0, 1, 2, 3, 4, 5, 6].filter(d => d !== dayOfWeek);
          
          const dayName = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][dayOfWeek];
          console.log(`Création pour ${dayName} avec horaires ${startTime}-${endTime}`);
          
          const result = await createAvailabilityForPeriod.mutateAsync({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            startTime: startTime,
            endTime: endTime,
            slotDuration: formData.slotDuration,
            excludeDays: excludeDaysForThisDay,
            timeExclusions: timeExclusions.filter(exclusion => {
              const excDate = new Date(exclusion.date);
              return excDate.getDay() === dayOfWeek;
            })
          });
          
          totalSlotsCreated += result || 0;
        }
        
        setSlotsCreatedCount(totalSlotsCreated);
        setCreationStep('success');
        refetch();
        onSlotsCreated?.(totalSlotsCreated);
      } else {
        // Pas d'horaires spécifiques : comportement normal
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
      }
    } catch (error) {
      console.error('Erreur lors de la création des créneaux:', error);
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
          isCreating={createAvailabilityForPeriod.isPending || creationStep === 'creating'}
          isModifying={creationStep === 'modify'}
          onCreateSlots={handleCreateSlots}
        />
      </CardContent>
    </Card>
  );
};

export default SlotCreationForm;
