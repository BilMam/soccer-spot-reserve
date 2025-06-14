
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import FieldBasicInfoForm from './FieldBasicInfoForm';
import FieldScheduleForm from './FieldScheduleForm';
import FieldAmenitiesForm from './FieldAmenitiesForm';

interface EditFieldFormProps {
  fieldId: string;
}

const EditFieldForm: React.FC<EditFieldFormProps> = ({ fieldId }) => {
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
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchField = async () => {
      if (!fieldId || !user) return;
      
      try {
        const { data, error } = await supabase
          .from('fields')
          .select('*')
          .eq('id', fieldId)
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
            amenities: data.amenities || [],
            images: data.images || []
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
  }, [fieldId, user, navigate, toast]);

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
    if (!user || !fieldId) return;
    
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
          images: formData.images,
          updated_at: new Date().toISOString()
        })
        .eq('id', fieldId)
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader className="w-6 h-6 animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Informations du terrain</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <FieldBasicInfoForm formData={formData} onInputChange={handleInputChange} />
          
          <FieldScheduleForm formData={formData} onInputChange={handleInputChange} />

          <FieldAmenitiesForm 
            amenities={formData.amenities} 
            onAmenityChange={handleAmenityChange} 
          />

          <div className="space-y-4">
            <Label>Photos du terrain</Label>
            <ImageUpload
              images={formData.images}
              onImagesChange={handleImagesChange}
              maxImages={10}
            />
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
  );
};

export default EditFieldForm;
