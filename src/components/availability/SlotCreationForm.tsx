
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Save } from 'lucide-react';
import { useAvailabilityManagement } from '@/hooks/useAvailabilityManagement';

interface SlotCreationFormProps {
  fieldId: string;
  startDate: Date;
  endDate: Date;
  onSlotsCreated?: () => void;
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

  const daysOfWeek = [
    { value: 0, label: 'Dimanche' },
    { value: 1, label: 'Lundi' },
    { value: 2, label: 'Mardi' },
    { value: 3, label: 'Mercredi' },
    { value: 4, label: 'Jeudi' },
    { value: 5, label: 'Vendredi' },
    { value: 6, label: 'Samedi' }
  ];

  const handleDayToggle = (dayValue: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      excludeDays: checked 
        ? prev.excludeDays.filter(d => d !== dayValue)
        : [...prev.excludeDays, dayValue]
    }));
  };

  const handleCreateSlots = async () => {
    try {
      await createAvailabilityForPeriod.mutateAsync({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        startTime: formData.startTime,
        endTime: formData.endTime,
        slotDuration: formData.slotDuration,
        excludeDays: formData.excludeDays
      });
      
      onSlotsCreated?.();
    } catch (error) {
      console.error('Erreur lors de la création des créneaux:', error);
    }
  };

  const calculateTotalSlots = () => {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const activeDays = days - Math.floor(days / 7) * formData.excludeDays.length;
    
    const startMinutes = parseInt(formData.startTime.split(':')[0]) * 60 + parseInt(formData.startTime.split(':')[1]);
    const endMinutes = parseInt(formData.endTime.split(':')[0]) * 60 + parseInt(formData.endTime.split(':')[1]);
    const slotsPerDay = Math.floor((endMinutes - startMinutes) / formData.slotDuration);
    
    return activeDays * slotsPerDay;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Créer les créneaux pour la période
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration des horaires */}
        <div className="space-y-4">
          <h4 className="font-medium">Horaires de disponibilité</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Heure d'ouverture</label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Heure de fermeture</label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Durée des créneaux (minutes)</label>
            <Input
              type="number"
              min="15"
              max="120"
              step="15"
              value={formData.slotDuration}
              onChange={(e) => setFormData(prev => ({ ...prev, slotDuration: parseInt(e.target.value) }))}
            />
          </div>
        </div>

        {/* Sélection des jours */}
        <div className="space-y-4">
          <h4 className="font-medium">Jours d'ouverture</h4>
          <p className="text-sm text-gray-600">
            Décochez les jours où votre terrain sera fermé
          </p>
          
          <div className="space-y-2">
            {daysOfWeek.map((day) => {
              const isExcluded = formData.excludeDays.includes(day.value);
              return (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={!isExc    uded}
                    onCheckedChange={(checked) => handleDayToggle(day.value, !!checked)}
                  />
                  <label
                    htmlFor={`day-${day.value}`}
                    className={`text-sm ${isExcluded ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                  >
                    {day.label}
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Résumé */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2">Résumé de la création</h4>
          <div className="space-y-2 text-sm text-blue-700">
            <div className="flex justify-between">
              <span>Période :</span>
              <span>{startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Horaires :</span>
              <span>{formData.startTime} - {formData.endTime}</span>
            </div>
            <div className="flex justify-between">
              <span>Durée des créneaux :</span>
              <span>{formData.slotDuration} minutes</span>
            </div>
            <div className="flex justify-between">
              <span>Jours exclus :</span>
              <span>{formData.excludeDays.length > 0 ? `${formData.excludeDays.length} jour(s)` : 'Aucun'}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-2">
              <span>Total créneaux estimés :</span>
              <Badge variant="secondary">{calculateTotalSlots()}</Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
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
