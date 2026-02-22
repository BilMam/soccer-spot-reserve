import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FieldMediaCarouselProps {
  images: string[] | null;
  fallback: string;
  fieldName: string;
  fieldType: string;
  rating: number;
  totalReviews: number;
  getFieldTypeLabel: (type: string) => string;
}

const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

const FieldMediaCarousel: React.FC<FieldMediaCarouselProps> = ({
  images,
  fallback,
  fieldName,
  fieldType,
  rating,
  totalReviews,
  getFieldTypeLabel,
}) => {
  const media = images && images.length > 0 ? images : [fallback];
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasMultiple = media.length > 1;

  const prev = () => setCurrentIndex((i) => (i === 0 ? media.length - 1 : i - 1));
  const next = () => setCurrentIndex((i) => (i === media.length - 1 ? 0 : i + 1));

  const currentUrl = media[currentIndex];

  return (
    <div className="relative h-96 rounded-2xl overflow-hidden group">
      {isVideo(currentUrl) ? (
        <video
          key={currentUrl}
          src={currentUrl}
          controls
          className="w-full h-full object-cover"
        />
      ) : (
        <img
          src={currentUrl}
          alt={`${fieldName} - ${currentIndex + 1}`}
          className="w-full h-full object-cover"
        />
      )}

      <div className="absolute top-4 left-4">
        <Badge className="bg-green-600 hover:bg-green-700">
          {getFieldTypeLabel(fieldType)}
        </Badge>
      </div>
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 flex items-center space-x-1">
        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        <span className="font-medium">{rating}</span>
        <span className="text-gray-500">({totalReviews})</span>
      </div>

      {hasMultiple && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {hasMultiple && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {media.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FieldMediaCarousel;
