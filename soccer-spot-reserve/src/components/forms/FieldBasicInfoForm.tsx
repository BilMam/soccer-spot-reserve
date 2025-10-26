import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MapPin } from 'lucide-react';
import { SPORTS, SPORT_FIELD_TYPES, SPORT_CAPACITIES, SportType } from '@/constants/sports';

interface FieldBasicInfoFormProps {
  formData: {
    name: string;
    description: string;
    location: string;
    address: string;
    city: string;
    field_type: string;
    capacity: number;
    price_per_hour: number;
    sport_type?: string;
  };
  onInputChange: (field: string, value: string | number) => void;
}

const FieldBasicInfoForm: React.FC<FieldBasicInfoFormProps> = ({ formData, onInputChange }) => {
  const [selectedSport, setSelectedSport] = useState<SportType>(
    (formData.sport_type as SportType) || 'football'
  );

  // Met à jour le sport sélectionné et réinitialise field_type et capacity si nécessaire
  const handleSportChange = (sport: SportType) => {
    setSelectedSport(sport);
    onInputChange('sport_type', sport);
    
    // Réinitialiser field_type et capacity aux premières valeurs du nouveau sport
    const firstFieldType = SPORT_FIELD_TYPES[sport][0]?.value;
    const firstCapacity = SPORT_CAPACITIES[sport][0]?.value;
    
    if (firstFieldType) {
      onInputChange('field_type', firstFieldType);
    }
    if (firstCapacity) {
      onInputChange('capacity', firstCapacity);
    }
  };

  // Options dynamiques selon le sport
  const fieldTypes = SPORT_FIELD_TYPES[selectedSport] || SPORT_FIELD_TYPES.football;
  const capacities = SPORT_CAPACITIES[selectedSport] || SPORT_CAPACITIES.football;

  return (
    <div className="space-y-6">
      {/* Sélecteur de sport */}
      <div className="space-y-2">
        <Label htmlFor="sport_type">Sport *</Label>
        <Select 
          value={selectedSport} 
          onValueChange={handleSportChange}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner le sport" />
          </SelectTrigger>
          <SelectContent>
            {SPORTS.map((sport) => (
              <SelectItem key={sport.value} value={sport.value}>
                {sport.icon} {sport.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Nom du terrain */}
      <div className="space-y-2">
        <Label htmlFor="name">Nom du terrain *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => onInputChange('name', e.target.value)}
          placeholder="Ex: Stade Cocody"
          required
        />
      </div>

      {/* Type de surface - Options dynamiques selon le sport */}
      <div className="space-y-2">
        <Label htmlFor="field_type">Type de surface *</Label>
        <Select 
          value={formData.field_type} 
          onValueChange={(value) => onInputChange('field_type', value)}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner le type" />
          </SelectTrigger>
          <SelectContent>
            {fieldTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Capacité - Options dynamiques selon le sport */}
      <div className="space-y-2">
        <Label htmlFor="capacity">Format de jeu *</Label>
        <Select 
          value={formData.capacity?.toString()} 
          onValueChange={(value) => onInputChange('capacity', parseInt(value))}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner le format" />
          </SelectTrigger>
          <SelectContent>
            {capacities.map((cap) => (
              <SelectItem key={cap.value} value={cap.value.toString()}>
                {cap.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Prix par heure */}
      <div className="space-y-2">
        <Label htmlFor="price_per_hour">Prix par heure (XOF) *</Label>
        <Input
          id="price_per_hour"
          type="number"
          value={formData.price_per_hour}
          onChange={(e) => onInputChange('price_per_hour', parseFloat(e.target.value))}
          placeholder="Ex: 30000"
          required
        />
      </div>

      {/* Localisation */}
      <div className="space-y-2">
        <Label htmlFor="location">Quartier *</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => onInputChange('location', e.target.value)}
          placeholder="Ex: Cocody"
          required
        />
      </div>

      {/* Adresse */}
      <div className="space-y-2">
        <Label htmlFor="address">Adresse complète *</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => onInputChange('address', e.target.value)}
          placeholder="Ex: Rue des Jardins, Cocody"
          required
        />
        <div className="flex items-start space-x-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Pour une meilleure visibilité, indiquez l'adresse complète avec des points de repère connus 
            (ex: "Près de la pharmacie centrale, Boulevard Latrille")
          </p>
        </div>
      </div>

      {/* Ville */}
      <div className="space-y-2">
        <Label htmlFor="city">Ville *</Label>
        <Input
          id="city"
          value={formData.city}
          onChange={(e) => onInputChange('city', e.target.value)}
          placeholder="Ex: Abidjan"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => onInputChange('description', e.target.value)}
          placeholder="Décrivez votre terrain, ses atouts, les équipements disponibles..."
          rows={4}
        />
      </div>
    </div>
  );
};

export default FieldBasicInfoForm;
