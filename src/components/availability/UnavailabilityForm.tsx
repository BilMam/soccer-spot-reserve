
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UnavailabilityFormData {
  startTime: string;
  endTime: string;
  reason: string;
  notes: string;
}

interface UnavailabilityFormProps {
  onSubmit: (formData: UnavailabilityFormData) => void;
  isLoading?: boolean;
}

const UnavailabilityForm: React.FC<UnavailabilityFormProps> = ({ onSubmit, isLoading = false }) => {
  const [formData, setFormData] = useState<UnavailabilityFormData>({
    startTime: '08:00',
    endTime: '18:00',
    reason: 'Maintenance',
    notes: ''
  });

  const handleSubmit = () => {
    onSubmit(formData);
    // Reset form after submission
    setFormData({
      startTime: '08:00',
      endTime: '18:00',
      reason: 'Maintenance',
      notes: ''
    });
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <h4 className="font-medium">Marquer une plage comme indisponible</h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Heure de début</label>
          <Input
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Heure de fin</label>
          <Input
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Raison</label>
        <Select 
          value={formData.reason} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Maintenance">Maintenance</SelectItem>
            <SelectItem value="Travaux">Travaux</SelectItem>
            <SelectItem value="Événement privé">Événement privé</SelectItem>
            <SelectItem value="Congés">Congés</SelectItem>
            <SelectItem value="Autre">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">Notes (optionnel)</label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Détails supplémentaires..."
        />
      </div>

      <Button 
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Application...' : 'Marquer la plage comme indisponible'}
      </Button>
    </div>
  );
};

export default UnavailabilityForm;
