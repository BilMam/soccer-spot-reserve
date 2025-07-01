
import React from 'react';
import { MapPin } from 'lucide-react';

interface Field {
  id: string;
  name: string;
  location: string;
  price: number;
  rating: number;
  latitude?: number;
  longitude?: number;
  reviews?: number;
}

interface MapOverlaysProps {
  isGeocoding: boolean;
  isLoaded: boolean;
  fields: Field[];
}

const MapOverlays: React.FC<MapOverlaysProps> = ({ 
  isGeocoding, 
  isLoaded, 
  fields 
}) => {
  return (
    <>
      {/* Indicateur de géocodage */}
      {isGeocoding && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-3 flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
          <span className="text-sm text-gray-700">Localisation en cours...</span>
        </div>
      )}
      
      {/* Indicateur de terrains trouvés */}
      {isLoaded && fields.length > 0 && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-3">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">
              {fields.filter(f => f.latitude && f.longitude).length} terrain(s) localisé(s)
            </span>
          </div>
        </div>
      )}
      
      {/* Chargement initial */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <div className="text-gray-600">Chargement de Google Maps...</div>
          </div>
        </div>
      )}
    </>
  );
};

export default MapOverlays;
