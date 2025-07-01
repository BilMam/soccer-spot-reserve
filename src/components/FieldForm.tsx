import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FieldBasicInfoForm from '@/components/forms/FieldBasicInfoForm';
import FieldScheduleForm from '@/components/forms/FieldScheduleForm';
import FieldAmenitiesForm from '@/components/forms/FieldAmenitiesForm';
import FieldImageForm from '@/components/forms/FieldImageForm';
import FieldFormActions from '@/components/forms/FieldFormActions';
import { useGeocodingService } from '@/hooks/useGeocodingService';
import { toast } from 'sonner';

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
  latitude?: number;
  longitude?: number;
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
    field_type: 'synthetic',
    capacity: '',
    price_per_hour: '',
    availability_start: '08:00',
    availability_end: '22:00',
    amenities: [] as string[],
    images: [] as string[],
    latitude: null as number | null,
    longitude: null as number | null
  });

  const { geocodeFieldAddress, isLoading: isGeocoding, error: geocodingError } = useGeocodingService();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Géocodage automatique quand l'adresse ou la ville change
  useEffect(() => {
    const geocodeAddress = async () => {
      if (formData.address && formData.city) {
        console.log('🔍 Géocodage automatique de l\'adresse...');
        const result = await geocodeFieldAddress(formData.address, formData.city);
        
        if (result) {
          setFormData(prev => ({
            ...prev,
            latitude: result.latitude,
            longitude: result.longitude
          }));
          toast.success('📍 Adresse localisée avec succès !');
        } else if (geocodingError) {
          toast.error(`❌ ${geocodingError}`);
        }
      }
    };

    // Debounce pour éviter trop d'appels
    const timer = setTimeout(geocodeAddress, 1000);
    return () => clearTimeout(timer);
  }, [formData.address, formData.city, geocodeFieldAddress, geocodingError]);

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
    
    if (!formData.latitude || !formData.longitude) {
      toast.error('📍 Veuillez saisir une adresse valide pour localiser le terrain');
      return;
    }
    
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
      latitude: formData.latitude,
      longitude: formData.longitude,
    };

    await onSubmit(fieldData);
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Informations du terrain</CardTitle>
        {isGeocoding && (
          <div className="text-sm text-gray-600 flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
            <span>Localisation de l'adresse en cours...</span>
          </div>
        )}
        {formData.latitude && formData.longitude && (
          <div className="text-sm text-green-600">
            ✅ Terrain localisé : {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <FieldBasicInfoForm
            formData={formData}
            onInputChange={handleInputChange}
          />

          <FieldScheduleForm
            formData={formData}
            onInputChange={handleInputChange}
          />

          <FieldAmenitiesForm
            amenities={formData.amenities}
            onAmenityChange={handleAmenityChange}
          />

          <FieldImageForm
            images={formData.images}
            onImagesChange={handleImagesChange}
          />

          <FieldFormActions isLoading={isLoading || isGeocoding} />
        </form>
      </CardContent>
    </Card>
  );
};

export default FieldForm;
