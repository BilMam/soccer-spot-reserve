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

      // 2. Préparer accès rapide aux horaires spécifiques par jour
      // Map : dayOfWeek -> { startTime, endTime }
      const specificTimesMap = new Map(
        (formData.daySpecificTimes || []).map((dst) => [dst.dayOfWeek, dst])
      );

      let totalSlotsCreated = 0;

      // 3. Pour chaque jour de la semaine (0 = dimanche ... 6 = samedi),
      //    on détermine l'horaire à appliquer pour CE jour,
      //    puis on appelle la RPC pour créer UNIQUEMENT ce jour.
      for (let dow = 0; dow <= 6; dow++) {
        // si le jour est exclu (terrain fermé ce jour-là), on saute
        if (formData.excludeDays.includes(dow)) {
          console.log(`⏭️ Jour ${dow} exclu, skip`);
          continue;
        }

        // horaire pour ce jour : spécifique si défini, sinon global
        const specific = specificTimesMap.get(dow);
        const dayStart = specific ? specific.startTime : formData.startTime;
        const dayEnd = specific ? specific.endTime : formData.endTime;

        // sécurité
        if (!dayStart || !dayEnd) {
          console.warn(`⚠️ Pas d'horaires pour le jour ${dow}, skip`);
          continue;
        }

        const dayName = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][dow];
        console.log(`📅 Création créneaux pour ${dayName} (${dow}): ${dayStart}-${dayEnd}`);

        // on veut créer uniquement les créneaux de CE jour-là de la semaine
        // donc on passe excludeDays = tous les autres jours
        const excludeDaysForThisCall = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== dow);

        // appel RPC Supabase pour générer les créneaux de ce jour
        const result = await createAvailabilityForPeriod.mutateAsync({
          startDate: startDateISO,
          endDate: endDateISO,
          startTime: dayStart,
          endTime: dayEnd,
          slotDuration: formData.slotDuration,
          excludeDays: excludeDaysForThisCall,
          // Filtrer timeExclusions pour ne garder que celles de ce jour
          timeExclusions: timeExclusions.filter((excl) => {
            const excDate = new Date(excl.date);
            return excDate.getDay() === dow;
          })
        });

        const slotsForThisDay = result || 0;
        console.log(`  ✅ ${slotsForThisDay} créneaux créés pour ${dayName}`);
        totalSlotsCreated += slotsForThisDay;
      }

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
          isCreating={createAvailabilityForPeriod.isPending || creationStep === 'creating'}
          isModifying={creationStep === 'modify'}
          onCreateSlots={handleCreateSlots}
        />
      </CardContent>
    </Card>
  );
};

export default SlotCreationForm;
