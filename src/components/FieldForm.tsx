
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FieldBasicInfoForm from '@/components/forms/FieldBasicInfoForm';
import FieldScheduleForm from '@/components/forms/FieldScheduleForm';
import FieldAmenitiesForm from '@/components/forms/FieldAmenitiesForm';
import FieldImageForm from '@/components/forms/FieldImageForm';
import FieldFormActions from '@/components/forms/FieldFormActions';

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
    field_type: 'football',
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

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Informations du terrain</CardTitle>
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

          <FieldFormActions isLoading={isLoading} />
        </form>
      </CardContent>
    </Card>
  );
};

export default FieldForm;
