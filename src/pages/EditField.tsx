import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader } from 'lucide-react';

const EditField = () => {
  const { id } = useParams<{ id: string }>();
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
    amenities: [] as string[]
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldTypes = [
    { value: 'football', label: 'Football' },
    { value: 'basketball', label: 'Basketball' },
    { value: 'tennis', label: 'Tennis' },
    { value: 'volleyball', label: 'Volleyball' },
    { value: 'badminton', label: 'Badminton' },
    { value: 'futsal', label: 'Futsal' }
  ];

  const availableAmenities = [
    'Parking gratuit',
    'Vestiaires',
    'Douches',
    'Éclairage',
    'Matériel fourni',
    'Boissons disponibles',
    'Restauration',
    'WiFi',
    'Climatisation'
  ];

  useEffect(() => {
    const fetchField = async () => {
      if (!id || !user) return;
      
      try {
        const { data, error } = await supabase
          .from('fields')
          .select('*')
          .eq('id', id)
          .eq('owner_id', user.id)
          .single();

        if (error) throw error;
        
        if (data) {
          setFormData({
            name: data.name,
            description: data.description || '',
            location: data.location,
            address: data.address,
            city: data.city,
            field_type: data.field_type,
            capacity: data.capacity.toString(),
            price_per_hour: data.price_per_hour.toString(),
            availability_start: data.availability_start || '08:00',
            availability_end: data.availability_end || '22:00',
            amenities: data.amenities || []
          });
        }
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les données du terrain.",
          variant: "destructive"
        });
        navigate('/owner/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchField();
  }, [id, user, navigate, toast]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('fields')
        .update({
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
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('owner_id', user.id);

      if (error) throw error;

      toast({
        title: "Terrain mis à jour",
        description: "Les modifications ont été sauvegardées avec succès.",
      });

      navigate('/owner/dashboard');
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le terrain. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès non autorisé</h1>
          <p className="text-gray-600">Vous devez être connecté pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader className="w-6 h-6 animate-spin" />
            <span>Chargement...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/owner/dashboard')}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Modifier le terrain</h1>
            <p className="text-gray-600 mt-1">Mettez à jour les informations de votre terrain</p>
          </div>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Informations du terrain</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du terrain *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ex: Terrain de football Central"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="field_type">Type de terrain *</Label>
                  <Select 
                    value={formData.field_type} 
                    onValueChange={(value) => handleInputChange('field_type', value)}
                    required
                  >
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

                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacité (nombre de joueurs) *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => handleInputChange('capacity', e.target.value)}
                    placeholder="Ex: 22"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price_per_hour">Prix par heure (€) *</Label>
                  <Input
                    id="price_per_hour"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price_per_hour}
                    onChange={(e) => handleInputChange('price_per_hour', e.target.value)}
                    placeholder="Ex: 50.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Quartier/Zone *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Ex: Centre-ville"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Ville *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Ex: Paris"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availability_start">Heure d'ouverture</Label>
                  <Input
                    id="availability_start"
                    type="time"
                    value={formData.availability_start}
                    onChange={(e) => handleInputChange('availability_start', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availability_end">Heure de fermeture</Label>
                  <Input
                    id="availability_end"
                    type="time"
                    value={formData.availability_end}
                    onChange={(e) => handleInputChange('availability_end', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse complète *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Ex: 123 Rue du Sport, 75001 Paris"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Décrivez votre terrain, ses spécificités, les équipements disponibles..."
                  rows={4}
                />
              </div>

              <div className="space-y-4">
                <Label>Équipements disponibles</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableAmenities.map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <Checkbox
                        id={amenity}
                        checked={formData.amenities.includes(amenity)}
                        onCheckedChange={(checked) => handleAmenityChange(amenity, checked as boolean)}
                      />
                      <Label htmlFor={amenity} className="text-sm">{amenity}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/owner/dashboard')}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Mise à jour...' : 'Mettre à jour'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditField;
