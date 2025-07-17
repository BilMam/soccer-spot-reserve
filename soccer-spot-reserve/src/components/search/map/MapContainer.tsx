
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
        console.log('🔄 Initialisation MapContainer...');
        console.log('📦 Élément conteneur:', mapContainer.current);
        
        if (!mapContainer.current) {
          console.error('❌ Conteneur de carte non trouvé');
          onError('Conteneur de carte non disponible');
          return;
        }

        console.log('🔄 Chargement de Google Maps API...');
        await loadGoogleMaps();
        
        if (!window.google || !window.google.maps) {
          console.error('❌ Google Maps API non chargée');
          onError('Google Maps API non disponible');
          return;
        }

        console.log('✅ Google Maps API chargée, création de la carte...');
        
        // Configuration simplifiée pour le diagnostic
        const mapOptions = {
          center: ABIDJAN_CONFIG.center,
          zoom: ABIDJAN_CONFIG.zoom,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          // Temporairement désactiver les styles personnalisés pour le diagnostic
          // styles: MYSPORT_MAP_STYLES,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        };

        console.log('🗺️ Configuration carte:', mapOptions);

        const map = new window.google.maps.Map(mapContainer.current, mapOptions);
        
        // Attendre que la carte soit complètement chargée
        map.addListener('idle', () => {
          console.log('✅ Carte complètement chargée et prête');
          console.log('📍 Centre actuel:', map.getCenter()?.toJSON());
          console.log('🔍 Zoom actuel:', map.getZoom());
        });

        map.addListener('tilesloaded', () => {
          console.log('🎨 Tuiles de carte chargées');
        });

        console.log('🗺️ Carte Google Maps créée avec succès');
        onMapLoad(map);
        
      } catch (err) {
        console.error('❌ Erreur détaillée lors du chargement:', err);
        console.error('📊 Stack trace:', err instanceof Error ? err.stack : 'Pas de stack trace');
        onError(`Erreur lors du chargement de Google Maps: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      }
    };

    initializeMap();
  }, [onMapLoad, onError]);

  return (
    <div 
      ref={mapContainer} 
      className="absolute inset-0"
      style={{ 
        minHeight: '400px',
        backgroundColor: '#e5e7eb' // Couleur de fond pour voir si le conteneur est présent
      }}
    />
  );
};

export default MapContainer;
