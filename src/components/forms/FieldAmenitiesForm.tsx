
import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface FieldAmenitiesFormProps {
  amenities: string[];
  onAmenityChange: (amenity: string, checked: boolean) => void;
}

const availableAmenities = [
  'Parking gratuit',
  'Vestiaires',
  'Douches',
  'Éclairage',
  'Terrain couvert',
  'Chasubles',
  'Balles',
  'Arbitrage',
  'Boissons disponibles',
  'Restauration',
  'WiFi',
  'Climatisation'
];

const FieldAmenitiesForm: React.FC<FieldAmenitiesFormProps> = ({ amenities, onAmenityChange }) => {
  return (
    <div className="space-y-4">
      <Label>Équipements disponibles</Label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {availableAmenities.map((amenity) => (
          <div key={amenity} className="flex items-center space-x-2">
            <Checkbox
              id={amenity}
              checked={amenities.includes(amenity)}
              onCheckedChange={(checked) => onAmenityChange(amenity, checked as boolean)}
            />
            <Label htmlFor={amenity} className="text-sm">{amenity}</Label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FieldAmenitiesForm;
