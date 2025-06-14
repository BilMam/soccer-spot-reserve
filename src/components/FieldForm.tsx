
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, MapPin, Clock, Euro, Users } from 'lucide-react';

const fieldSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères'),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères'),
  location: z.string().min(5, 'La localisation doit contenir au moins 5 caractères'),
  address: z.string().min(10, 'L\'adresse doit être complète'),
  city: z.string().min(2, 'La ville est requise'),
  price_per_hour: z.number().min(5, 'Le prix minimum est de 5€/heure').max(200, 'Le prix maximum est de 200€/heure'),
  capacity: z.number().min(2, 'Capacité minimum de 2 joueurs').max(50, 'Capacité maximum de 50 joueurs'),
  field_type: z.enum(['natural_grass', 'synthetic', 'indoor', 'street']),
  availability_start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format heure invalide (HH:MM)'),
  availability_end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format heure invalide (HH:MM)'),
  amenities: z.array(z.string()),
  images: z.array(z.string().url('URL d\'image invalide')).min(1, 'Au moins une image est requise')
});

type FieldFormData = z.infer<typeof fieldSchema>;

interface FieldFormProps {
  onSubmit: (data: FieldFormData) => Promise<void>;
  isLoading?: boolean;
  initialData?: Partial<FieldFormData>;
}

const FIELD_TYPES = [
  { value: 'natural_grass', label: 'Gazon naturel' },
  { value: 'synthetic', label: 'Synthétique' },
  { value: 'indoor', label: 'Intérieur' },
  { value: 'street', label: 'Street/Urbain' }
];

const COMMON_AMENITIES = [
  'Parking', 'Vestiaires', 'Douches', 'Wifi', 'Éclairage', 
  'Climatisation', 'Accès libre', 'Sécurité', 'Caféteria', 'Matériel'
];

const FieldForm: React.FC<FieldFormProps> = ({ onSubmit, isLoading = false, initialData }) => {
  const form = useForm<FieldFormData>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      name: '',
      description: '',
      location: '',
      address: '',
      city: '',
      price_per_hour: 30,
      capacity: 14,
      field_type: 'synthetic',
      availability_start: '08:00',
      availability_end: '22:00',
      amenities: [],
      images: [],
      ...initialData
    }
  });

  const [newAmenity, setNewAmenity] = React.useState('');
  const [newImageUrl, setNewImageUrl] = React.useState('');

  const watchedAmenities = form.watch('amenities');
  const watchedImages = form.watch('images');

  const addAmenity = (amenity: string) => {
    const currentAmenities = form.getValues('amenities');
    if (amenity && !currentAmenities.includes(amenity)) {
      form.setValue('amenities', [...currentAmenities, amenity]);
    }
    setNewAmenity('');
  };

  const removeAmenity = (amenityToRemove: string) => {
    const currentAmenities = form.getValues('amenities');
    form.setValue('amenities', currentAmenities.filter(a => a !== amenityToRemove));
  };

  const addImage = () => {
    if (newImageUrl) {
      try {
        new URL(newImageUrl); // Valider l'URL
        const currentImages = form.getValues('images');
        if (!currentImages.includes(newImageUrl)) {
          form.setValue('images', [...currentImages, newImageUrl]);
        }
        setNewImageUrl('');
      } catch {
        form.setError('images', { message: 'URL d\'image invalide' });
      }
    }
  };

  const removeImage = (imageToRemove: string) => {
    const currentImages = form.getValues('images');
    form.setValue('images', currentImages.filter(img => img !== imageToRemove));
  };

  const validateTimeRange = (data: FieldFormData) => {
    const start = data.availability_start.split(':').map(Number);
    const end = data.availability_end.split(':').map(Number);
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    
    if (endMinutes <= startMinutes) {
      form.setError('availability_end', { 
        message: 'L\'heure de fermeture doit être après l\'heure d\'ouverture' 
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (data: FieldFormData) => {
    console.log('Form data before validation:', data);
    
    if (!validateTimeRange(data)) {
      return;
    }

    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Informations de base */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Informations de base</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du terrain *</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Stade Municipal..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Décrivez votre terrain..." 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localisation *</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: Paris 15ème" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville *</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: Paris" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse complète *</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: 123 Rue de la République" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Caractéristiques */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Caractéristiques</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="field_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de terrain *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FIELD_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacité (joueurs) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="2" 
                        max="50"
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price_per_hour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix/heure (€) *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input 
                          type="number" 
                          min="5" 
                          max="200"
                          step="0.01"
                          className="pl-10"
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Horaires */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Horaires d'ouverture</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="availability_start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure d'ouverture *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="availability_end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure de fermeture *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Équipements */}
        <Card>
          <CardHeader>
            <CardTitle>Équipements disponibles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {COMMON_AMENITIES.map(amenity => (
                <Badge
                  key={amenity}
                  variant={watchedAmenities.includes(amenity) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    if (watchedAmenities.includes(amenity)) {
                      removeAmenity(amenity);
                    } else {
                      addAmenity(amenity);
                    }
                  }}
                >
                  {amenity}
                </Badge>
              ))}
            </div>

            <div className="flex space-x-2">
              <Input
                placeholder="Ajouter un équipement personnalisé"
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity(newAmenity))}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => addAmenity(newAmenity)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {watchedAmenities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {watchedAmenities.map(amenity => (
                  <Badge key={amenity} variant="secondary" className="flex items-center space-x-1">
                    <span>{amenity}</span>
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeAmenity(amenity)} 
                    />
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Photos du terrain</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="URL de l'image"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
              />
              <Button type="button" variant="outline" onClick={addImage}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {watchedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {watchedImages.map((imageUrl, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={imageUrl} 
                      alt={`Image ${index + 1}`}
                      className="w-full h-32 object-cover rounded border"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1"
                      onClick={() => removeImage(imageUrl)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <FormMessage>{form.formState.errors.images?.message}</FormMessage>
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          className="w-full bg-green-600 hover:bg-green-700" 
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? 'Création en cours...' : 'Créer le terrain'}
        </Button>
      </form>
    </Form>
  );
};

export default FieldForm;
