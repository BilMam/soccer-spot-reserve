
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';

const FieldForm: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    address: '',
    city: '',
    field_type: '',
    capacity: '',
    price_per_hour: '',
    availability_start: '08:00',
    availability_end: '22:00',
    amenities: [] as string[],
    images: [] as string[]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const createFieldMutation = useMutation({
    mutationFn: async (fieldData: any) => {
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      const { data, error } = await supabase
        .from('fields')
        .insert({
          ...fieldData,
          owner_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la création:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Terrain ajouté avec succès",
        description: "Votre terrain a été créé et est maintenant disponible.",
      });
      navigate('/owner/dashboard');
    },
    onError: (error: any) => {
      console.error('Erreur lors de la création du terrain:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le terrain",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const fieldData = {
      name: formData.name,
      description: formData.description,
      location: formData.location,
      address: formData.address,
      city: formData.city,
      field_type: formData.field_type,
      capacity: parseInt(formData.capacity),
      price_per_hour: parseFloat(formData.price_per_hour),
      availability_start: formData.availability_start,
      availability_end: formData.availability_end,
      amenities: formData.amenities,
      images: formData.images,
    };

    createFieldMutation.mutate(fieldData);
    setIsSubmitting(false);
  };

  const fieldTypes = [
    'Football',
    'Tennis',
    'Basketball',
    'Volleyball',
    'Badminton',
    'Padel',
    'Rugby',
    'Hockey'
  ];

  const amenitiesList = [
    'Parking',
    'Vestiaires',
    'Douches',
    'Éclairage',
    'Terrain couvert',
    'Restaurant',
    'WiFi',
    'Matériel fourni'
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
                    <SelectItem key={type} value={type}>
                      {type}
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
              <Input
                id="capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => handleInputChange('capacity', e.target.value)}
                placeholder="Ex: 22"
                min="1"
                required
              />
            </div>

            <div>
              <Label htmlFor="price_per_hour">Prix par heure (€) *</Label>
              <Input
                id="price_per_hour"
                type="number"
                step="0.01"
                value={formData.price_per_hour}
                onChange={(e) => handleInputChange('price_per_hour', e.target.value)}
                placeholder="Ex: 50.00"
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
            <Button type="button" variant="outline" onClick={() => navigate('/owner/dashboard')}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
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
