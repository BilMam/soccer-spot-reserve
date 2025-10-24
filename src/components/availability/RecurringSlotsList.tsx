import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Repeat, Trash2, Edit, Calendar, Clock, Info } from 'lucide-react';
import { RecurringSlot } from '@/hooks/useRecurringSlots';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RecurringSlotsListProps {
  slots: RecurringSlot[];
  onEdit: (slot: RecurringSlot) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
  isLoading?: boolean;
}

const DAYS_MAP: Record<number, string> = {
  0: 'Dimanche',
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi'
};

interface SlotGroup {
  slots: RecurringSlot[];
  days: number[];
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string | null;
  label: string | null;
  notes: string | null;
  is_active: boolean;
}

const groupSlots = (slots: RecurringSlot[]): SlotGroup[] => {
  const groups: Map<string, SlotGroup> = new Map();

  slots.forEach(slot => {
    const key = `${slot.start_time}-${slot.end_time}-${slot.start_date}-${slot.end_date || ''}-${slot.label || ''}-${slot.notes || ''}`;
    
    if (groups.has(key)) {
      const group = groups.get(key)!;
      group.slots.push(slot);
      group.days.push(slot.day_of_week);
      // Un groupe est actif si tous ses slots sont actifs
      group.is_active = group.is_active && slot.is_active;
    } else {
      groups.set(key, {
        slots: [slot],
        days: [slot.day_of_week],
        start_time: slot.start_time,
        end_time: slot.end_time,
        start_date: slot.start_date,
        end_date: slot.end_date,
        label: slot.label,
        notes: slot.notes,
        is_active: slot.is_active
      });
    }
  });

  return Array.from(groups.values()).map(group => ({
    ...group,
    days: group.days.sort((a, b) => a - b)
  }));
};

const formatDaysList = (days: number[]): string => {
  if (days.length === 0) return '';
  if (days.length === 1) return DAYS_MAP[days[0]].toLowerCase() + 's';
  
  const dayNames = days.map(d => DAYS_MAP[d].toLowerCase() + 's');
  const lastDay = dayNames.pop();
  return dayNames.join(', ') + ' et ' + lastDay;
};

const RecurringSlotsList: React.FC<RecurringSlotsListProps> = ({
  slots,
  onEdit,
  onDelete,
  onToggle,
  isLoading
}) => {
  const [deleteGroup, setDeleteGroup] = useState<SlotGroup | null>(null);

  const groupedSlots = useMemo(() => groupSlots(slots), [slots]);

  const handleEdit = (group: SlotGroup) => {
    // On passe le premier slot avec tous les jours du groupe
    const slotWithDays = {
      ...group.slots[0],
      days: group.days // Ajout d'une propriété temporaire pour le formulaire
    };
    onEdit(slotWithDays as any);
  };

  const handleDelete = () => {
    if (deleteGroup) {
      // Supprimer tous les slots du groupe
      deleteGroup.slots.forEach(slot => {
        onDelete(slot.id!);
      });
      setDeleteGroup(null);
    }
  };

  const handleToggle = (group: SlotGroup, checked: boolean) => {
    // Toggle tous les slots du groupe
    group.slots.forEach(slot => {
      onToggle(slot.id!, checked);
    });
  };

  if (slots.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Repeat className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center">
            Aucun créneau récurrent configuré
          </p>
          <p className="text-sm text-muted-foreground/70 text-center mt-2">
            Créez votre premier créneau récurrent pour automatiser vos disponibilités
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {groupedSlots.map((group, index) => (
          <Card key={`group-${index}`} className={!group.is_active ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Repeat className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                      {group.label || `Créneau récurrent`}
                      <Badge variant={group.is_active ? 'default' : 'secondary'}>
                        {group.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tous les {formatDaysList(group.days)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={group.is_active}
                    onCheckedChange={(checked) => handleToggle(group, checked)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {group.start_time} - {group.end_time}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Du {format(new Date(group.start_date), 'dd MMM yyyy', { locale: fr })}
                    {group.end_date
                      ? ` au ${format(new Date(group.end_date), 'dd MMM yyyy', { locale: fr })}`
                      : ' (indéfini)'}
                  </span>
                </div>
              </div>

              {group.notes && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>{group.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(group)}
                  disabled={isLoading}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteGroup(group)}
                  disabled={isLoading}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteGroup} onOpenChange={() => setDeleteGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le créneau récurrent ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. {deleteGroup && deleteGroup.slots.length > 1 
                ? `Les ${deleteGroup.slots.length} créneaux seront supprimés`
                : 'Le créneau sera supprimé'} et n'apparaîtra plus dans votre calendrier.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RecurringSlotsList;
