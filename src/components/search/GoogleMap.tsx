
import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import MapContainer from './map/MapContainer';
import MapMarkers from './map/MapMarkers';
import MapOverlays from './map/MapOverlays';
import MapSearchHandler from './map/MapSearchHandler';

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

interface GoogleMapProps {
  fields: Field[];
  onFieldSelect?: (fieldId: string) => void;
  searchLocation?: string;
}

const GoogleMap: React.FC<GoogleMapProps> = ({ fields, onFieldSelect, searchLocation }) => {
  const map = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  const handleMapLoad = (loadedMap: any) => {
    map.current = loadedMap;
    setIsLoaded(true);
    setError('');
  };

  const handleMapError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoaded(false);
  };

  const handleGeocodingStart = () => setIsGeocoding(true);
  const handleGeocodingEnd = () => setIsGeocoding(false);

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="space-y-4">
          <MapPin className="w-12 h-12 mx-auto text-red-500" />
          <div>
            <h3 className="text-lg font-semibold mb-2 text-red-600">Erreur de chargement</h3>
            <p className="text-gray-600 text-sm">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="relative w-full h-96 rounded-lg overflow-hidden shadow-md">
      <MapContainer onMapLoad={handleMapLoad} onError={handleMapError} />
      
      {isLoaded && (
        <>
          <MapMarkers 
            map={map.current}
            fields={fields}
            onFieldSelect={onFieldSelect}
            searchLocation={searchLocation}
          />
          
          <MapSearchHandler
            map={map.current}
            searchLocation={searchLocation}
            onGeocodingStart={handleGeocodingStart}
            onGeocodingEnd={handleGeocodingEnd}
          />
        </>
      )}
      
      <MapOverlays 
        isGeocoding={isGeocoding}
        isLoaded={isLoaded}
        fields={fields}
      />
    </div>
  );
};

export default GoogleMap;
