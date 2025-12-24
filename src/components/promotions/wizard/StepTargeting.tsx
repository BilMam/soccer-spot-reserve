import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Clock, Plus, X, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Field {
  id: string;
  name: string;
  location?: string;
}

interface TimeSlot {
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
}

interface StepTargetingProps {
  fields: Field[];
  allFields: boolean;
  selectedFieldIds: string[];
  allSlots: boolean;
  selectedSlots: TimeSlot[];
  onAllFieldsChange: (value: boolean) => void;
  onFieldsChange: (ids: string[]) => void;
  onAllSlotsChange: (value: boolean) => void;
  onSlotsChange: (slots: TimeSlot[]) => void;
}

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DEFAULT_SLOTS = [
  { label: 'Matin (8h-12h)', startTime: '08:00', endTime: '12:00' },
  { label: 'Après-midi (12h-17h)', startTime: '12:00', endTime: '17:00' },
  { label: 'Soir (17h-22h)', startTime: '17:00', endTime: '22:00' },
];

const StepTargeting: React.FC<StepTargetingProps> = ({
  fields,
  allFields,
  selectedFieldIds,
  allSlots,
  selectedSlots,
  onAllFieldsChange,
  onFieldsChange,
  onAllSlotsChange,
  onSlotsChange
}) => {
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<{ start: string; end: string } | null>(null);
  
  // Mode créneau personnalisé
  const [customMode, setCustomMode] = useState(false);
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');

  const toggleField = (fieldId: string) => {
    if (selectedFieldIds.includes(fieldId)) {
      onFieldsChange(selectedFieldIds.filter(id => id !== fieldId));
    } else {
      onFieldsChange([...selectedFieldIds, fieldId]);
    }
  };

  const addSlot = () => {
    if (selectedTimeRange) {
      const newSlot: TimeSlot = {
        dayOfWeek: selectedDay,
        startTime: selectedTimeRange.start,
        endTime: selectedTimeRange.end
      };
      onSlotsChange([...selectedSlots, newSlot]);
      setSelectedDay(null);
      setSelectedTimeRange(null);
      setShowSlotPicker(false);
    }
  };

  const addCustomSlot = () => {
    if (customStartTime && customEndTime && customStartTime < customEndTime) {
      const newSlot: TimeSlot = {
        dayOfWeek: selectedDay,
        startTime: customStartTime,
        endTime: customEndTime
      };
      onSlotsChange([...selectedSlots, newSlot]);
      setSelectedDay(null);
      setCustomStartTime('');
      setCustomEndTime('');
      setCustomMode(false);
      setShowSlotPicker(false);
    }
  };

  const removeSlot = (index: number) => {
    onSlotsChange(selectedSlots.filter((_, i) => i !== index));
  };

  const formatSlot = (slot: TimeSlot) => {
    const dayStr = slot.dayOfWeek !== null ? DAYS[slot.dayOfWeek] : 'Tous les jours';
    return `${dayStr} ${slot.startTime} - ${slot.endTime}`;
  };

  const isCustomTimeValid = customStartTime && customEndTime && customStartTime < customEndTime;

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold mb-2">Ciblage</h3>
        <p className="text-muted-foreground">
          Définissez où et quand cette promotion s'applique
        </p>
      </div>

      {/* Terrains */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-muted-foreground" />
          <h4 className="font-medium">Terrains concernés</h4>
        </div>

        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="all-fields"
            checked={allFields}
            onCheckedChange={(checked) => onAllFieldsChange(checked as boolean)}
          />
          <Label htmlFor="all-fields" className="cursor-pointer">
            Tous mes terrains
          </Label>
        </div>

        {!allFields && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
            {fields.map((field) => (
              <button
                key={field.id}
                type="button"
                onClick={() => toggleField(field.id)}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all",
                  selectedFieldIds.includes(field.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className="font-medium">{field.name}</span>
                {field.location && (
                  <span className="text-sm text-muted-foreground block">{field.location}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Créneaux */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <h4 className="font-medium">Créneaux horaires</h4>
        </div>

        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="all-slots"
            checked={allSlots}
            onCheckedChange={(checked) => onAllSlotsChange(checked as boolean)}
          />
          <Label htmlFor="all-slots" className="cursor-pointer">
            Tous les créneaux
          </Label>
        </div>

        {!allSlots && (
          <div className="space-y-4 pl-6">
            {/* Selected slots */}
            {selectedSlots.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedSlots.map((slot, index) => (
                  <Badge key={index} variant="secondary" className="gap-1 py-1.5">
                    {formatSlot(slot)}
                    <button
                      type="button"
                      onClick={() => removeSlot(index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Slot picker */}
            {showSlotPicker ? (
              <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                {/* Sélection du jour */}
                <div>
                  <Label className="mb-2 block text-sm font-medium">Jour (optionnel)</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={selectedDay === null ? "default" : "outline"}
                      onClick={() => setSelectedDay(null)}
                    >
                      Tous
                    </Button>
                    {DAYS.map((day, i) => (
                      <Button
                        key={i}
                        type="button"
                        size="sm"
                        variant={selectedDay === i ? "default" : "outline"}
                        onClick={() => setSelectedDay(i)}
                      >
                        {day.slice(0, 3)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Toggle mode prédéfini / personnalisé */}
                <div className="flex gap-2 border-b pb-3">
                  <Button
                    type="button"
                    size="sm"
                    variant={!customMode ? "default" : "ghost"}
                    onClick={() => setCustomMode(false)}
                  >
                    Plages prédéfinies
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={customMode ? "default" : "ghost"}
                    onClick={() => setCustomMode(true)}
                    className="gap-1"
                  >
                    <Settings2 className="w-3 h-3" />
                    Créneau personnalisé
                  </Button>
                </div>

                {!customMode ? (
                  /* Plages prédéfinies */
                  <div>
                    <Label className="mb-2 block text-sm font-medium">Plage horaire</Label>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_SLOTS.map((slot) => (
                        <Button
                          key={slot.label}
                          type="button"
                          size="sm"
                          variant={
                            selectedTimeRange?.start === slot.startTime &&
                            selectedTimeRange?.end === slot.endTime
                              ? "default"
                              : "outline"
                          }
                          onClick={() => setSelectedTimeRange({ start: slot.startTime, end: slot.endTime })}
                        >
                          {slot.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Créneau personnalisé */
                  <div className="space-y-3">
                    <Label className="block text-sm font-medium">Horaires précis</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Début</Label>
                        <Input
                          type="time"
                          value={customStartTime}
                          onChange={(e) => setCustomStartTime(e.target.value)}
                          className="text-center"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Fin</Label>
                        <Input
                          type="time"
                          value={customEndTime}
                          onChange={(e) => setCustomEndTime(e.target.value)}
                          className="text-center"
                        />
                      </div>
                    </div>
                    {customStartTime && customEndTime && !isCustomTimeValid && (
                      <p className="text-xs text-destructive">
                        L'heure de fin doit être après l'heure de début
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {!customMode ? (
                    <Button
                      type="button"
                      onClick={addSlot}
                      disabled={!selectedTimeRange}
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Ajouter
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={addCustomSlot}
                      disabled={!isCustomTimeValid}
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Ajouter ce créneau
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowSlotPicker(false);
                      setCustomMode(false);
                      setCustomStartTime('');
                      setCustomEndTime('');
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSlotPicker(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un créneau
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StepTargeting;
