import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Repeat, Trash2, Clock } from 'lucide-react';
import { useRecurringSlots, RecurringSlot } from '@/hooks/useRecurringSlots';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import RecurringSlotForm from './RecurringSlotForm';

interface RecurringSlotsManagementProps {
  fieldId: string;
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

const RecurringSlotsManagement: React.FC<RecurringSlotsManagementProps> = ({ fieldId }) => {
  const { recurringSlots, isLoading, toggleRecurringSlot, deleteRecurringSlot } = useRecurringSlots(fieldId);
  const [showForm, setShowForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<RecurringSlot | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleEdit = (slot: RecurringSlot) => {
    setEditingSlot(slot);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await deleteRecurringSlot.mutateAsync(id);
    setDeleteConfirm(null);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    await toggleRecurringSlot.mutateAsync({ id, is_active: !currentStatus });
  };

  const getDayLabel = (dayOfWeek: number) => {
    return DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || '';
  };

  const groupSlotsByConfig = () => {
    const groups: Record<string, RecurringSlot[]> = {};
    
    recurringSlots.forEach(slot => {
      const key = `${slot.start_time}-${slot.end_time}-${slot.label || 'unlabeled'}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(slot);
    });
    
    return Object.values(groups);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showForm) {
    return (
      <RecurringSlotForm
        fieldId={fieldId}
        editingSlot={editingSlot}
        onClose={() => {
          setShowForm(false);
          setEditingSlot(null);
        }}
      />
    );
  }

  const slotGroups = groupSlotsByConfig();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5" />
            Créneaux récurrents
          </CardTitle>
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau créneau récurrent
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Bloquez automatiquement des créneaux qui se répètent chaque semaine
        </p>
      </CardHeader>
      <CardContent>
        {recurringSlots.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Aucun créneau récurrent
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Créez des créneaux qui se répètent chaque semaine pour bloquer automatiquement des plages horaires
            </p>
            <Button onClick={() => setShowForm(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Créer un créneau récurrent
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {slotGroups.map((group, groupIndex) => {
              const firstSlot = group[0];
              return (
                <div
                  key={groupIndex}
                  className="border-2 border-dashed border-purple-300 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {firstSlot.label && (
                        <div className="font-medium text-lg mb-2">{firstSlot.label}</div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Clock className="w-4 h-4" />
                        {firstSlot.start_time} - {firstSlot.end_time}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {group.map(slot => (
                          <Badge
                            key={slot.id}
                            variant={slot.is_active ? "default" : "secondary"}
                            className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                          >
                            {getDayLabel(slot.day_of_week)}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Du {format(new Date(firstSlot.start_date), 'dd MMMM yyyy', { locale: fr })}
                        {firstSlot.end_date && (
                          <> au {format(new Date(firstSlot.end_date), 'dd MMMM yyyy', { locale: fr })}</>
                        )}
                      </div>
                      {firstSlot.notes && (
                        <div className="text-xs text-muted-foreground mt-2 italic">
                          {firstSlot.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={firstSlot.is_active}
                        onCheckedChange={() => {
                          group.forEach(slot => {
                            if (slot.id) {
                              handleToggle(slot.id, slot.is_active);
                            }
                          });
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(firstSlot)}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (firstSlot.id) {
                            setDeleteConfirm(firstSlot.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <Repeat className="w-3 h-3 mr-1" />
                    Récurrent
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce créneau récurrent ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Les créneaux correspondants redeviendront disponibles à la réservation.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default RecurringSlotsManagement;
