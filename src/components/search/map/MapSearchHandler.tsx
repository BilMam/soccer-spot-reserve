
import React, { useEffect } from 'react';
import { geocodeLocationQuery } from '@/utils/geocodingUtils';

interface MapSearchHandlerProps {
  map: any;
  searchLocation?: string;
  onGeocodingStart: () => void;
  onGeocodingEnd: () => void;
}

const MapSearchHandler: React.FC<MapSearchHandlerProps> = ({
  map,
  searchLocation,
  onGeocodingStart,
  onGeocodingEnd
}) => {
  // Centrer la carte sur la zone de recherche
  const centerMapOnSearchLocation = async (location: string) => {
    if (!map || !location) return;

    onGeocodingStart();
    try {
      const coordinates = await geocodeLocationQuery(location);
      if (coordinates) {
        map.setCenter(coordinates);
        map.setZoom(13);
        console.log('🎯 Carte centrée sur:', location, coordinates);
      }
    } catch (error) {
      console.error('Erreur centrage carte:', error);
    } finally {
      onGeocodingEnd();
    }
  };

  useEffect(() => {
    if (map && searchLocation) {
      centerMapOnSearchLocation(searchLocation);
    }
  }, [map, searchLocation]);

  return null;
};

export default MapSearchHandler;
