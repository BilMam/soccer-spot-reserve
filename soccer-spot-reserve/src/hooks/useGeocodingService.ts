
import { useState, useCallback, useRef } from 'react';
import { geocodeAddress, loadGoogleMaps, reverseGeocode } from '@/utils/googleMapsUtils';

interface GeocodingResult {
  latitude: number;
  longitude: number;
  address: string;
  source: 'geocoding' | 'geolocation';
}

export const useGeocodingService = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApiReady, setIsApiReady] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 3;

  // Initialiser Google Maps API
  const initializeGoogleMaps = useCallback(async () => {
    if (window.google && window.google.maps) {
      setIsApiReady(true);
      return true;
    }

    try {
      console.log('🔄 Chargement de Google Maps API...');
      await loadGoogleMaps();
      setIsApiReady(true);
      console.log('✅ Google Maps API chargée avec succès');
      return true;
    } catch (err) {
      console.error('❌ Erreur chargement Google Maps API:', err);
      setError('Impossible de charger Google Maps. Vérifiez votre connexion internet.');
      return false;
    }
  }, []);

  const geocodeFieldAddress = useCallback(async (address: string, city: string): Promise<GeocodingResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Vérifier si l'API est prête, sinon la charger
      if (!isApiReady) {
        const loaded = await initializeGoogleMaps();
        if (!loaded) {
          return null;
        }
      }

      const fullAddress = `${address}, ${city}, Côte d'Ivoire`;
      console.log('🔍 Géocodage de l\'adresse:', fullAddress);
      
      const coordinates = await geocodeAddress(fullAddress);
      
      if (coordinates) {
        console.log('✅ Coordonnées trouvées:', coordinates);
        retryCount.current = 0; // Reset retry count on success
        return {
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          address: fullAddress,
          source: 'geocoding'
        };
      } else {
        // Retry logic pour les échecs temporaires
        if (retryCount.current < maxRetries) {
          retryCount.current++;
          console.log(`🔄 Tentative ${retryCount.current}/${maxRetries} de géocodage...`);
          
          // Attendre un peu avant de réessayer
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount.current));
          return await geocodeFieldAddress(address, city);
        }
        
        setError('Impossible de localiser cette adresse. Vérifiez qu\'elle est correcte.');
        return null;
      }
    } catch (err) {
      console.error('❌ Erreur de géocodage:', err);
      
      // Retry logic pour les erreurs
      if (retryCount.current < maxRetries) {
        retryCount.current++;
        console.log(`🔄 Nouvelle tentative ${retryCount.current}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount.current));
        return await geocodeFieldAddress(address, city);
      }
      
      setError('Erreur lors de la localisation de l\'adresse. Réessayez plus tard.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isApiReady, initializeGoogleMaps]);

  const getCurrentLocation = useCallback(async (): Promise<GeocodingResult | null> => {
    setIsGeolocating(true);
    setError(null);

    try {
      // Vérifier si la géolocalisation est supportée
      if (!navigator.geolocation) {
        setError('La géolocalisation n\'est pas supportée par votre navigateur.');
        return null;
      }

      // Vérifier si l'API Google Maps est prête
      if (!isApiReady) {
        const loaded = await initializeGoogleMaps();
        if (!loaded) {
          return null;
        }
      }

      console.log('📍 Demande de géolocalisation...');

      // Obtenir la position actuelle
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      });

      const { latitude, longitude } = position.coords;
      console.log('✅ Position obtenue:', { latitude, longitude });

      // Faire du reverse geocoding pour obtenir l'adresse
      const address = await reverseGeocode(latitude, longitude);
      
      return {
        latitude,
        longitude,
        address: address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        source: 'geolocation'
      };

    } catch (err: any) {
      console.error('❌ Erreur de géolocalisation:', err);
      
      let errorMessage = 'Erreur lors de la géolocalisation.';
      
      if (err.code === 1) {
        errorMessage = 'Permission de géolocalisation refusée. Veuillez autoriser l\'accès à votre position.';
      } else if (err.code === 2) {
        errorMessage = 'Position non disponible. Vérifiez votre connexion GPS.';
      } else if (err.code === 3) {
        errorMessage = 'Délai d\'attente dépassé pour la géolocalisation.';
      }
      
      setError(errorMessage);
      return null;
    } finally {
      setIsGeolocating(false);
    }
  }, [isApiReady, initializeGoogleMaps]);

  const manualGeocode = useCallback(async (address: string, city: string) => {
    retryCount.current = 0; // Reset retry count for manual attempts
    return await geocodeFieldAddress(address, city);
  }, [geocodeFieldAddress]);

  return {
    geocodeFieldAddress,
    getCurrentLocation,
    manualGeocode,
    isLoading,
    isGeolocating,
    error,
    isApiReady,
    initializeGoogleMaps,
    clearError: () => setError(null)
  };
};
