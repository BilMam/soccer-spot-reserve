import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { RecurringSlot } from '@/hooks/useRecurringSlots';

interface RecurringSlotFormProps {
  fieldId: string;
  onSubmit: (data: Omit<RecurringSlot, 'id'>) => void;
  onCancel: () => void;
  initialData?: RecurringSlot;
  isLoading?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dimanche' },
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' }
];

const RecurringSlotForm: React.FC<RecurringSlotFormProps> = ({
  fieldId,
  onSubmit,
  onCancel,
  initialData,
  isLoading
}) => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      day_of_week: initialData?.day_of_week ?? 1,
      start_time: initialData?.start_time ?? '08:00',
      end_time: initialData?.end_time ?? '22:00',
      start_date: initialData?.start_date ?? new Date().toISOString().split('T')[0],
      end_date: initialData?.end_date ?? '',
      label: initialData?.label ?? '',
      notes: initialData?.notes ?? ''
    }
  });

  const dayOfWeek = watch('day_of_week');

  const handleFormSubmit = (data: any) => {
    onSubmit({
      field_id: fieldId,
      day_of_week: Number(data.day_of_week),
      start_time: data.start_time,
      end_time: data.end_time,
      start_date: data.start_date,
      end_date: data.end_date || null,
      label: data.label || null,
      notes: data.notes || null,
      is_active: true
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Jour de la semaine */}
        <div className="space-y-2">
          <Label htmlFor="day_of_week">Jour de la semaine *</Label>
          <Select
            value={String(dayOfWeek)}
            onValueChange={(value) => setValue('day_of_week', Number(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((day) => (
                <SelectItem key={day.value} value={String(day.value)}>
                  {day.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Label optionnel */}
        <div className="space-y-2">
          <Label htmlFor="label">Label (optionnel)</Label>
          <Input
            id="label"
            {...register('label')}
            placeholder="Ex: Entraînement du mardi"
          />
        </div>

        {/* Heure de début */}
        <div className="space-y-2">
          <Label htmlFor="start_time">Heure de début *</Label>
          <Input
            id="start_time"
            type="time"
            {...register('start_time', { required: 'Obligatoire' })}
          />
          {errors.start_time && (
            <p className="text-sm text-destructive">{errors.start_time.message}</p>
          )}
        </div>

        {/* Heure de fin */}
        <div className="space-y-2">
          <Label htmlFor="end_time">Heure de fin *</Label>
          <Input
            id="end_time"
            type="time"
            {...register('end_time', { required: 'Obligatoire' })}
          />
          {errors.end_time && (
            <p className="text-sm text-destructive">{errors.end_time.message}</p>
          )}
        </div>

        {/* Date de début */}
        <div className="space-y-2">
          <Label htmlFor="start_date">Début de la récurrence *</Label>
          <div className="relative">
            <Input
              id="start_date"
              type="date"
              {...register('start_date', { required: 'Obligatoire' })}
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          {errors.start_date && (
            <p className="text-sm text-destructive">{errors.start_date.message}</p>
          )}
        </div>

        {/* Date de fin */}
        <div className="space-y-2">
          <Label htmlFor="end_date">Fin de la récurrence (optionnel)</Label>
          <div className="relative">
            <Input
              id="end_date"
              type="date"
              {...register('end_date')}
              placeholder="Laisser vide pour indéfini"
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          <p className="text-xs text-muted-foreground">
            Laisser vide pour une récurrence indéfinie
          </p>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optionnel)</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Ajoutez des notes si nécessaire..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Enregistrement...' : initialData ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};

export default RecurringSlotForm;
