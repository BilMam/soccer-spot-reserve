
import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader } from 'lucide-react';

interface FieldFormActionsProps {
  isLoading: boolean;
  onCancel?: () => void;
}

const FieldFormActions: React.FC<FieldFormActionsProps> = ({ isLoading, onCancel }) => {
  return (
    <div className="flex justify-end space-x-4 pt-6">
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      )}
      <Button
        type="submit"
        disabled={isLoading}
        className="bg-green-600 hover:bg-green-700"
      >
        {isLoading ? (
          <>
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            Soumission en cours...
          </>
        ) : (
          'Soumettre pour approbation'
        )}
      </Button>
    </div>
  );
};

export default FieldFormActions;
