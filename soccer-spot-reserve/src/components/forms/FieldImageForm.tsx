
import React from 'react';
import { Label } from '@/components/ui/label';
import ImageUpload from '@/components/ImageUpload';

interface FieldImageFormProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
}

const FieldImageForm: React.FC<FieldImageFormProps> = ({ images, onImagesChange }) => {
  return (
    <div className="space-y-4">
      <Label>Photos et vidéos du terrain</Label>
      <ImageUpload
        images={images}
        onImagesChange={onImagesChange}
        maxImages={10}
      />
    </div>
  );
};

export default FieldImageForm;
