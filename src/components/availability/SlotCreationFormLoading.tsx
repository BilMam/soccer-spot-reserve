
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

const SlotCreationFormLoading: React.FC = () => {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Vérification des créneaux existants...</span>
      </CardContent>
    </Card>
  );
};

export default SlotCreationFormLoading;
