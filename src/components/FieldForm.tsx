

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';

interface FieldFormData {
  name: string;
  description: string;
  location: string;
  address: string;
  city: string;
  price_per_hour: number;
  capacity: number;
  field_type: 'natural_grass' | 'synthetic' | 'street';
  availability_start: string;
  availability_end: string;
  amenities: string[];
  images: string[];
}

interface FieldFormProps {
  onSubmit: (fieldData: FieldFormData) => Promise<void>;
  isLoading: boolean;
}

const FieldForm: React.FC<FieldFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    address: '',
    city: '',
    field_type: 'natural_grass',
    capacity: '',
    price_per_hour: '',
    availability_start: '08:00',
    availability_end: '22:00',
    amenities: [] as string[],
    images: [] as string[]
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      amenities: checked
        ? [...prev.amenities, amenity]
        : prev.amenities.filter(a => a !== amenity)
    }));
  };

  const handleImagesChange = (images: string[]) => {
    setFormData(prev => ({ ...prev, images }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const fieldData: FieldFormData = {
      name: formData.name,
      description: formData.description,
      location: formData.location,
      address: formData.address,
      city: formData.city,
      field_type: formData.field_type as 'natural_grass' | 'synthetic' | 'street',
      capacity: parseInt(formData.capacity),
      price_per_hour: parseFloat(formData.price_per_hour),
      availability_start: formData.availability_start,
      availability_end: formData.availability_end,
      amenities: formData.amenities,
      images: formData.images,
    };

    await onSubmit(fieldData);
  };

  const fieldTypes = [
    { value: 'natural_grass', label: 'Pelouse naturelle' },
    { value: 'synthetic', label: 'Synthétique' },
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

  const amenitiesList = [
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

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Informations du terrain</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Nom du terrain *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: Terrain de football Municipal"
                required
              />
            </div>

            <div>
              <Label htmlFor="field_type">Type de terrain *</Label>
              <Select value={formData.field_type} onValueChange={(value) => handleInputChange('field_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
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
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Décrivez votre terrain..."
              rows={3}
            />
          </div>

          {/* Localisation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="location">Lieu *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Ex: Centre sportif municipal"
                required
              />
            </div>

            <div>
              <Label htmlFor="address">Adresse *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Ex: 123 rue de la paix"
                required
              />
            </div>

            <div>
              <Label htmlFor="city">Ville *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Ex: Paris"
                required
              />
            </div>
          </div>

          {/* Capacité et prix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="capacity">Capacité (nombre de joueurs) *</Label>
              <Select 
                value={formData.capacity || undefined} 
                onValueChange={(value) => handleInputChange('capacity', value)}
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

            <div>
              <Label htmlFor="price_per_hour">Prix par heure (XOF) *</Label>
              <Input
                id="price_per_hour"
                type="number"
                step="1"
                value={formData.price_per_hour}
                onChange={(e) => handleInputChange('price_per_hour', e.target.value)}
                placeholder="Ex: 25000"
                min="0"
                required
              />
            </div>
          </div>

          {/* Horaires de disponibilité */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="availability_start">Heure d'ouverture</Label>
              <Input
                id="availability_start"
                type="time"
                value={formData.availability_start}
                onChange={(e) => handleInputChange('availability_start', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="availability_end">Heure de fermeture</Label>
              <Input
                id="availability_end"
                type="time"
                value={formData.availability_end}
                onChange={(e) => handleInputChange('availability_end', e.target.value)}
              />
            </div>
          </div>

          {/* Équipements */}
          <div>
            <Label>Équipements disponibles</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              {amenitiesList.map((amenity) => (
                <label key={amenity} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.amenities.includes(amenity)}
                    onChange={(e) => handleAmenityChange(amenity, e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{amenity}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div className="space-y-4">
            <Label>Photos du terrain</Label>
            <ImageUpload
              images={formData.images}
              onImagesChange={handleImagesChange}
              maxImages={10}
            />
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <Button type="button" variant="outline">
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Ajout en cours...
                </>
              ) : (
                'Ajouter le terrain'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default FieldForm;

