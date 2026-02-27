import React from 'react';
import { Separator } from '@/components/ui/separator';
import FieldImageForm from '@/components/forms/FieldImageForm';
import FieldAmenitiesForm from '@/components/forms/FieldAmenitiesForm';
import FieldPayoutAccountForm from '@/components/forms/FieldPayoutAccountForm';

interface FieldStepPhotosProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  amenities: string[];
  onAmenityChange: (amenity: string, checked: boolean) => void;
  payoutAccountId: string;
  onPayoutAccountChange: (accountId: string) => void;
}

const FieldStepPhotos: React.FC<FieldStepPhotosProps> = ({
  images,
  onImagesChange,
  amenities,
  onAmenityChange,
  payoutAccountId,
  onPayoutAccountChange,
}) => {
  return (
    <div className="space-y-6">
      <FieldImageForm images={images} onImagesChange={onImagesChange} />

      <Separator />

      <FieldAmenitiesForm amenities={amenities} onAmenityChange={onAmenityChange} />

      <Separator />

      <FieldPayoutAccountForm
        payoutAccountId={payoutAccountId}
        onPayoutAccountChange={onPayoutAccountChange}
      />
    </div>
  );
};

export default FieldStepPhotos;
