
import { useState, useCallback } from 'react';
import { geocodeAddress } from '@/utils/googleMapsUtils';

interface GeocodingResult {
  latitude: number;
  longitude: number;
  address: string;
}

export const useGeocodingService = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocodeFieldAddress = useCallback(async (address: string, city: string): Promise<GeocodingResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const fullAddress = `${address}, ${city}, Côte d'Ivoire`;
      console.log('🔍 Géocodage de l\'adresse:', fullAddress);
      
      const coordinates = await geocodeAddress(fullAddress);
      
      if (coordinates) {
        console.log('✅ Coordonnées trouvées:', coordinates);
        return {
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          address: fullAddress
        };
      } else {
        setError('Impossible de localiser cette adresse');
        return null;
      }
    } catch (err) {
      console.error('❌ Erreur de géocodage:', err);
      setError('Erreur lors de la localisation de l\'adresse');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    geocodeFieldAddress,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};
