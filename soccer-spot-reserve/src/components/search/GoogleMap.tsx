
import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { MapPin, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    console.log('🎉 GoogleMap: Carte chargée avec succès');
    map.current = loadedMap;
    setIsLoaded(true);
    setError('');
  };

  const handleMapError = (errorMessage: string) => {
    console.error('❌ GoogleMap: Erreur de carte:', errorMessage);
    setError(errorMessage);
    setIsLoaded(false);
  };

  const handleGeocodingStart = () => {
    console.log('🔍 GoogleMap: Début du géocodage');
    setIsGeocoding(true);
  };
  
  const handleGeocodingEnd = () => {
    console.log('✅ GoogleMap: Fin du géocodage');
    setIsGeocoding(false);
  };

  const handleRetry = () => {
    console.log('🔄 GoogleMap: Tentative de rechargement');
    setError('');
    setIsLoaded(false);
    // Forcer un rechargement en recréant le composant
    window.location.reload();
  };

  // Statistiques pour le debugging
  const fieldsWithCoords = fields.filter(f => f.latitude && f.longitude);
  const fieldsWithoutCoords = fields.filter(f => !f.latitude || !f.longitude);

  console.log('📊 GoogleMap Stats:', {
    totalFields: fields.length,
    withCoords: fieldsWithCoords.length,
    withoutCoords: fieldsWithoutCoords.length,
    isLoaded,
    error,
    searchLocation
  });

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="space-y-4">
          <MapPin className="w-12 h-12 mx-auto text-red-500" />
          <div>
            <h3 className="text-lg font-semibold mb-2 text-red-600">Erreur de chargement de la carte</h3>
            <p className="text-gray-600 text-sm mb-4">{error}</p>
            <Button onClick={handleRetry} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </div>
          {/* Informations de debug */}
          <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-left">
            <p><strong>Debug:</strong></p>
            <p>Terrains total: {fields.length}</p>
            <p>Avec coordonnées: {fieldsWithCoords.length}</p>
            <p>Sans coordonnées: {fieldsWithoutCoords.length}</p>
            {fieldsWithCoords.length > 0 && (
              <p>Premier terrain: {fieldsWithCoords[0].name} ({fieldsWithCoords[0].latitude}, {fieldsWithCoords[0].longitude})</p>
            )}
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

      {/* Panneau de debug temporaire */}
      <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded p-2 text-xs">
        <div>État: {isLoaded ? '✅ Chargée' : '⏳ Chargement...'}</div>
        <div>Terrains: {fieldsWithCoords.length}/{fields.length}</div>
        {searchLocation && <div>Recherche: {searchLocation}</div>}
      </div>
    </div>
  );
};

export default GoogleMap;
