
import React from 'react';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

interface SlotCreationFormActionsProps {
  isCreating: boolean;
  isModifying: boolean;
  onCreateSlots: () => void;
}

const SlotCreationFormActions: React.FC<SlotCreationFormActionsProps> = ({
  isCreating,
  isModifying,
  onCreateSlots
}) => {
  return (
    <div className="flex gap-2 mt-6">
      <Button 
        onClick={onCreateSlots}
        disabled={isCreating}
        className="flex-1"
      >
        <Save className="w-4 h-4 mr-2" />
        {isCreating ? 'Création...' : isModifying ? 'Appliquer les modifications' : 'Créer les créneaux'}
      </Button>
    </div>
  );
};

export default SlotCreationFormActions;
