import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';

interface FieldBasicInfoFormProps {
  formData: {
    name: string;
    description: string;
    location: string;
    address: string;
    city: string;
    field_type: string;
    capacity: string;
    price_per_hour: string;
    price_1h30?: string;
    price_2h?: string;
  };
  onInputChange: (field: string, value: string) => void;
}

const fieldTypes = [
  { value: 'synthetic', label: 'Synthétique' },
  { value: 'natural_grass', label: 'Pelouse naturelle' },
  { value: 'street', label: 'Street' }
];

const gameFormats = [
  { value: '10', label: '5v5 (10 joueurs)' },
  { value: '12', label: '6v6 (12 joueurs)' },
  { value: '14', label: '7v7 (14 joueurs)' },
  { value: '16', label: '8v8 (16 joueurs)' },
  { value: '18', label: '9v9 (18 joueurs)' },
  { value: '20', label: '10v10 (20 joueurs)' },
  { value: '22', label: '11v11 (22 joueurs)' }
];

const FieldBasicInfoForm: React.FC<FieldBasicInfoFormProps> = ({ formData, onInputChange }) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nom du terrain *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onInputChange('name', e.target.value)}
            placeholder="Ex: Terrain de football Cocody"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="field_type">Type de surface *</Label>
          <Select 
            value={formData.field_type || undefined} 
            onValueChange={(value) => onInputChange('field_type', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner le type de surface" />
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

        <div className="space-y-2">
          <Label htmlFor="capacity">Capacité (nombre de joueurs) *</Label>
          <Select 
            value={formData.capacity || undefined} 
            onValueChange={(value) => onInputChange('capacity', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner le format" />
            </SelectTrigger>
            <SelectContent>
              {gameFormats.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Tarification adaptative</h3>
              <p className="text-sm text-gray-600 mb-4">
                Définissez vos tarifs pour les durées les plus courantes. 
                Les autres durées seront calculées automatiquement à partir du tarif 1h.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_per_hour" className="flex items-center">
                  Prix 1 heure (XOF) *
                </Label>
                <Input
                  id="price_per_hour"
                  type="number"
                  min="0"
                  value={formData.price_per_hour}
                  onChange={(e) => onInputChange('price_per_hour', e.target.value)}
                  placeholder="Ex: 25000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price_1h30" className="flex items-center">
                  Prix 1h30 (XOF) *
                </Label>
                <Input
                  id="price_1h30"
                  type="number"
                  min="0"
                  value={formData.price_1h30 || ''}
                  onChange={(e) => onInputChange('price_1h30', e.target.value)}
                  placeholder="Ex: 35000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price_2h" className="flex items-center">
                  Prix 2 heures (XOF) *
                </Label>
                <Input
                  id="price_2h"
                  type="number"
                  min="0"
                  value={formData.price_2h || ''}
                  onChange={(e) => onInputChange('price_2h', e.target.value)}
                  placeholder="Ex: 45000"
                  required
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">💡 Comment ça marche :</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Pour 1h, 1h30 et 2h : vos prix fixes s'appliquent</li>
                  <li>Pour les autres durées (ex: 2h30, 3h, 4h) : calcul automatique basé sur le tarif 1h</li>
                  <li>Exemple : Si 1h = 25000 XOF, alors 3h = 75000 XOF (25000 × 3)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Quartier/Commune *</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => onInputChange('location', e.target.value)}
            placeholder="Ex: Cocody, Plateau, Marcory"
            required
          />
        </div>

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
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Adresse complète *</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => onInputChange('address', e.target.value)}
          placeholder="Ex: Rue des Sports, Cocody, Abidjan"
          required
        />
        
        {/* Indication d'aide pour l'adresse */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">💡 Conseil pour une localisation précise :</p>
              <p>
                Copiez l'adresse directement depuis <strong>Google Maps</strong> et collez-la ici, 
                ou utilisez le bouton <strong>"Utiliser ma position"</strong> ci-dessus pour une géolocalisation automatique.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => onInputChange('description', e.target.value)}
          placeholder="Décrivez votre terrain, ses spécificités, les équipements disponibles..."
          rows={4}
        />
      </div>
    </>
  );
};

export default FieldBasicInfoForm;
