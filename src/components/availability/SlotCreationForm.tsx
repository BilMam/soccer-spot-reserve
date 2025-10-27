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
  const { createAvailabilityForPeriod, setSlotsUnavailable } = useAvailabilityManagement(fieldId);
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

      const startDateISO = startDate.toISOString().split('T')[0];
      const endDateISO = endDate.toISOString().split('T')[0];

      // 1. En mode modification, on supprime les anciens créneaux pour cette période
      if (creationStep === 'modify') {
        console.log('Mode modification : suppression des créneaux existants...');
        
        const { error: deleteError } = await supabase
          .from('field_availability')
          .delete()
          .eq('field_id', fieldId)
          .gte('date', startDateISO)
          .lte('date', endDateISO);

        if (deleteError) {
          console.error('Erreur suppression anciennes dispos:', deleteError);
          toast.error('Impossible de supprimer les anciens créneaux');
          setCreationStep('preview');
          return;
        }
        
        console.log('✅ Créneaux existants supprimés avec succès');
      }

      // 2. Créer TOUS les créneaux avec les horaires globaux
      console.log(`📅 Création de tous les créneaux globaux: ${formData.startTime}-${formData.endTime}`);
      
      const globalResult = await createAvailabilityForPeriod.mutateAsync({
        startDate: startDateISO,
        endDate: endDateISO,
        startTime: formData.startTime,
        endTime: formData.endTime,
        slotDuration: formData.slotDuration,
        excludeDays: formData.excludeDays,
        timeExclusions: timeExclusions
      });

      let totalSlotsCreated = globalResult || 0;
      console.log(`✅ ${totalSlotsCreated} créneaux globaux créés`);

      // 3. Ajuster les jours avec horaires spécifiques
      if (formData.daySpecificTimes && formData.daySpecificTimes.length > 0) {
        console.log('🔧 Ajustement des horaires spécifiques par jour...');
        
        for (const dst of formData.daySpecificTimes) {
          if (formData.excludeDays.includes(dst.dayOfWeek)) {
            continue; // Jour déjà exclu
          }
          
          const dayName = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][dst.dayOfWeek];
          console.log(`  Ajustement pour ${dayName}: ${dst.startTime}-${dst.endTime} (global: ${formData.startTime}-${formData.endTime})`);
          
          // Pour chaque occurrence de ce jour dans la période
          let currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            if (currentDate.getDay() === dst.dayOfWeek) {
              const dateStr = currentDate.toISOString().split('T')[0];
              
              // Supprimer les créneaux AVANT l'heure de début spécifique
              if (dst.startTime > formData.startTime) {
                const { error: deleteBeforeError } = await supabase
                  .from('field_availability')
                  .delete()
                  .eq('field_id', fieldId)
                  .eq('date', dateStr)
                  .gte('start_time', formData.startTime)
                  .lt('start_time', dst.startTime);
                
                if (deleteBeforeError) {
                  console.error('Erreur suppression créneaux avant:', deleteBeforeError);
                }
              }
              
              // Supprimer les créneaux APRÈS l'heure de fin spécifique
              if (dst.endTime < formData.endTime) {
                const { error: deleteAfterError } = await supabase
                  .from('field_availability')
                  .delete()
                  .eq('field_id', fieldId)
                  .eq('date', dateStr)
                  .gte('start_time', dst.endTime);
                
                if (deleteAfterError) {
                  console.error('Erreur suppression créneaux après:', deleteAfterError);
                }
              }
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          console.log(`  ✅ ${dayName} ajusté`);
        }
      }

      console.log(`🎉 Total : ${totalSlotsCreated} créneaux créés et ajustés`);

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
          isCreating={createAvailabilityForPeriod.isPending || creationStep === 'creating'}
          isModifying={creationStep === 'modify'}
          onCreateSlots={handleCreateSlots}
        />
      </CardContent>
    </Card>
  );
};

export default SlotCreationForm;
