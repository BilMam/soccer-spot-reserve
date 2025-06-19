
import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

interface SlotCreationFormHeaderProps {
  isModifying: boolean;
}

const SlotCreationFormHeader: React.FC<SlotCreationFormHeaderProps> = ({
  isModifying
}) => {
  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Plus className="w-5 h-5" />
        {isModifying ? 'Modifier les créneaux' : 'Créer les créneaux pour la période'}
      </CardTitle>
    </CardHeader>
  );
};

export default SlotCreationFormHeader;
