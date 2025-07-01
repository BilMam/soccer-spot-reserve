
import React, { useRef, useEffect } from 'react';
import { loadGoogleMaps, ABIDJAN_CONFIG, MYSPORT_MAP_STYLES } from '@/utils/googleMapsUtils';

interface MapContainerProps {
  onMapLoad: (map: any) => void;
  onError: (error: string) => void;
}

const MapContainer: React.FC<MapContainerProps> = ({ onMapLoad, onError }) => {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeMap = async () => {
      try {
        console.log('🔄 Chargement de Google Maps...');
        await loadGoogleMaps();
        
        if (!mapContainer.current || !window.google) return;

        const mapOptions = {
          center: ABIDJAN_CONFIG.center,
          zoom: ABIDJAN_CONFIG.zoom,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          styles: MYSPORT_MAP_STYLES,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        };

        const map = new window.google.maps.Map(mapContainer.current, mapOptions);
        console.log('🗺️ Carte Google Maps initialisée avec succès');
        onMapLoad(map);
      } catch (err) {
        console.error('❌ Erreur chargement Google Maps:', err);
        onError('Erreur lors du chargement de Google Maps. Vérifiez votre connexion internet.');
      }
    };

    initializeMap();
  }, [onMapLoad, onError]);

  return <div ref={mapContainer} className="absolute inset-0" />;
};

export default MapContainer;
