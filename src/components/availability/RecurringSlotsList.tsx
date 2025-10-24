import React, { useState } from 'react';
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

const RecurringSlotsList: React.FC<RecurringSlotsListProps> = ({
  slots,
  onEdit,
  onDelete,
  onToggle,
  isLoading
}) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
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
        {slots.map((slot) => (
          <Card key={slot.id} className={!slot.is_active ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Repeat className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {slot.label || DAYS_MAP[slot.day_of_week]}
                      <Badge variant={slot.is_active ? 'default' : 'secondary'}>
                        {slot.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tous les {DAYS_MAP[slot.day_of_week].toLowerCase()}s
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={slot.is_active}
                    onCheckedChange={(checked) => onToggle(slot.id!, checked)}
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
                    {slot.start_time} - {slot.end_time}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Du {format(new Date(slot.start_date), 'dd MMM yyyy', { locale: fr })}
                    {slot.end_date
                      ? ` au ${format(new Date(slot.end_date), 'dd MMM yyyy', { locale: fr })}`
                      : ' (indéfini)'}
                  </span>
                </div>
              </div>

              {slot.notes && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>{slot.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(slot)}
                  disabled={isLoading}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteId(slot.id!)}
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le créneau récurrent ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le créneau récurrent sera supprimé et
              n'apparaîtra plus dans votre calendrier.
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
