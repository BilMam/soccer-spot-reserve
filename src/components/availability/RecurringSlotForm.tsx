import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save } from 'lucide-react';
import { useRecurringSlots, RecurringSlot } from '@/hooks/useRecurringSlots';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface RecurringSlotFormProps {
  fieldId: string;
  editingSlot?: RecurringSlot | null;
  onClose: () => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' }
];

const RecurringSlotForm: React.FC<RecurringSlotFormProps> = ({
  fieldId,
  editingSlot,
  onClose
}) => {
  const { createRecurringSlot, updateRecurringSlot } = useRecurringSlots(fieldId);
  
  const [formData, setFormData] = useState({
    selectedDays: editingSlot ? [editingSlot.day_of_week] : [] as number[],
    startTime: editingSlot?.start_time || '08:00',
    endTime: editingSlot?.end_time || '22:00',
    startDate: editingSlot?.start_date || format(new Date(), 'yyyy-MM-dd'),
    endDate: editingSlot?.end_date || '',
    label: editingSlot?.label || '',
    notes: editingSlot?.notes || ''
  });

  const handleDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(day)
        ? prev.selectedDays.filter(d => d !== day)
        : [...prev.selectedDays, day]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.selectedDays.length === 0) {
      return;
    }

    try {
      // Récupérer l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Utilisateur non authentifié');
        return;
      }

      if (editingSlot) {
        // Mise à jour
        await updateRecurringSlot.mutateAsync({
          id: editingSlot.id!,
          day_of_week: formData.selectedDays[0], // On ne met à jour qu'un seul jour à la fois
          start_time: formData.startTime,
          end_time: formData.endTime,
          start_date: formData.startDate,
          end_date: formData.endDate || undefined,
          label: formData.label || undefined,
          notes: formData.notes || undefined
        });
      } else {
        // Création - créer un slot pour chaque jour sélectionné
        for (const day of formData.selectedDays) {
          await createRecurringSlot.mutateAsync({
            field_id: fieldId,
            day_of_week: day,
            start_time: formData.startTime,
            end_time: formData.endTime,
            start_date: formData.startDate,
            end_date: formData.endDate || undefined,
            label: formData.label || undefined,
            notes: formData.notes || undefined,
            is_active: true,
            created_by: user.id
          });
        }
      }
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <CardTitle>
            {editingSlot ? 'Modifier' : 'Créer'} un créneau récurrent
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Définissez des créneaux qui se répètent automatiquement chaque semaine
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sélection des jours */}
          <div className="space-y-3">
            <Label>Jours de la semaine *</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DAYS_OF_WEEK.map(day => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={formData.selectedDays.includes(day.value)}
                    onCheckedChange={() => handleDayToggle(day.value)}
                    disabled={!!editingSlot} // Désactiver en mode édition
                  />
                  <label
                    htmlFor={`day-${day.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {day.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Horaires */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Heure de début *</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Heure de fin *</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Période de validité */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin (optionnelle)</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                min={formData.startDate}
              />
            </div>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="label">Nom du créneau (optionnel)</Label>
            <Input
              id="label"
              placeholder="Ex: École Maurice, Entraînement équipe A"
              value={formData.label}
              onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnelles)</Label>
            <Textarea
              id="notes"
              placeholder="Ajoutez des informations complémentaires..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={
                formData.selectedDays.length === 0 ||
                createRecurringSlot.isPending ||
                updateRecurringSlot.isPending
              }
            >
              <Save className="w-4 h-4 mr-2" />
              {editingSlot ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default RecurringSlotForm;
