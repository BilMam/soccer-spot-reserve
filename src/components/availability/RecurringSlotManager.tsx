import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useRecurringSlots, RecurringSlot } from '@/hooks/useRecurringSlots';
import RecurringSlotForm from './RecurringSlotForm';
import RecurringSlotsList from './RecurringSlotsList';

interface RecurringSlotManagerProps {
  fieldId: string;
  fieldName: string;
}

const RecurringSlotManager: React.FC<RecurringSlotManagerProps> = ({
  fieldId,
  fieldName
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<RecurringSlot | null>(null);

  const {
    useRecurringSlotsQuery,
    createRecurringSlot,
    updateRecurringSlot,
    deleteRecurringSlot,
    toggleRecurringSlot
  } = useRecurringSlots(fieldId);

  const { data: slots = [], isLoading } = useRecurringSlotsQuery();

  const handleCreate = () => {
    setEditingSlot(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (slot: RecurringSlot) => {
    setEditingSlot(slot);
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: Omit<RecurringSlot, 'id'>, selectedDays: number[]) => {
    if (editingSlot?.id) {
      updateRecurringSlot.mutate(
        { id: editingSlot.id, ...data },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            setEditingSlot(null);
          }
        }
      );
    } else {
      createRecurringSlot.mutate({ slotData: data, days: selectedDays }, {
        onSuccess: () => {
          setIsDialogOpen(false);
        }
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteRecurringSlot.mutate(id);
  };

  const handleToggle = (id: string, isActive: boolean) => {
    toggleRecurringSlot.mutate({ id, is_active: isActive });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Créneaux récurrents</CardTitle>
              <CardDescription>
                Automatisez vos disponibilités avec des créneaux qui se répètent chaque semaine
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau créneau
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <RecurringSlotsList
            slots={slots}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggle={handleToggle}
            isLoading={isLoading || createRecurringSlot.isPending || updateRecurringSlot.isPending || deleteRecurringSlot.isPending}
          />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSlot ? 'Modifier le créneau récurrent' : 'Nouveau créneau récurrent'}
            </DialogTitle>
          </DialogHeader>
          <RecurringSlotForm
            fieldId={fieldId}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingSlot(null);
            }}
            initialData={editingSlot || undefined}
            isLoading={createRecurringSlot.isPending || updateRecurringSlot.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecurringSlotManager;
