
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface FieldScheduleFormProps {
  formData: {
    availability_start: string;
    availability_end: string;
  };
  onInputChange: (field: string, value: string) => void;
}

const FieldScheduleForm: React.FC<FieldScheduleFormProps> = ({ formData, onInputChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="availability_start">Heure d'ouverture</Label>
        <Input
          id="availability_start"
          type="time"
          value={formData.availability_start}
          onChange={(e) => onInputChange('availability_start', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="availability_end">Heure de fermeture</Label>
        <Input
          id="availability_end"
          type="time"
          value={formData.availability_end}
          onChange={(e) => onInputChange('availability_end', e.target.value)}
        />
      </div>
    </div>
  );
};

export default FieldScheduleForm;
