
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import FieldBasicInfoForm from '@/components/forms/FieldBasicInfoForm';
import FieldScheduleForm from '@/components/forms/FieldScheduleForm';
import FieldAmenitiesForm from '@/components/forms/FieldAmenitiesForm';

interface FieldFormProps {
  // You can add specific props here if needed
}

const FieldForm: React.FC<FieldFormProps> = () => {
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
          owner_id: user.id,
          status: 'pending' // Nouveau terrain en attente de validation
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
        description: "Votre terrain a été soumis pour validation. Il sera visible une fois approuvé par notre équipe.",
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
