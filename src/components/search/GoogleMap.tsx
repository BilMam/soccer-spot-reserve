
import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { loadGoogleMaps, ABIDJAN_CONFIG, MYSPORT_MAP_STYLES, createCustomMarker, createInfoWindowContent } from '@/utils/googleMapsUtils';

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
}

const GoogleMap: React.FC<GoogleMapProps> = ({ fields, onFieldSelect }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState('');

  // Initialiser la carte
  const initializeMap = () => {
    if (!mapContainer.current || !window.google) return;

    // Configuration de la carte centrée sur Abidjan
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

    map.current = new window.google.maps.Map(mapContainer.current, mapOptions);
    setIsLoaded(true);
    console.log('🗺️ Carte Google Maps initialisée avec succès');
  };

  // Charger Google Maps automatiquement
  useEffect(() => {
    if (!isLoaded) {
      console.log('🔄 Chargement de Google Maps...');
      loadGoogleMaps()
        .then(() => {
          initializeMap();
          setError('');
        })
        .catch((err) => {
          console.error('❌ Erreur chargement Google Maps:', err);
          setError('Erreur lors du chargement de Google Maps. Vérifiez votre connexion internet.');
        });
    }
  }, [isLoaded]);

  // Gérer les marqueurs
  useEffect(() => {
    if (!map.current || !isLoaded || !window.google) return;

    console.log('📍 Mise à jour des marqueurs:', fields.length);

    // Supprimer les anciens marqueurs
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    if (fields.length === 0) return;

    // Ajouter les nouveaux marqueurs
    const bounds = new window.google.maps.LatLngBounds();
    let hasValidCoordinates = false;

    fields.forEach(field => {
      if (field.latitude && field.longitude) {
        hasValidCoordinates = true;
        
        const position = { lat: field.latitude, lng: field.longitude };
        
        // Créer un marqueur personnalisé
        const marker = new window.google.maps.Marker({
          position,
          map: map.current,
          title: field.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#16a34a',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });

        // Créer une InfoWindow
        const infoWindow = new window.google.maps.InfoWindow({
          content: createInfoWindowContent(field)
        });

        // Événements du marqueur
        marker.addListener('click', () => {
          // Fermer toutes les autres InfoWindows
          markersRef.current.forEach(({ infoWindow: iw }) => iw?.close());
          infoWindow.open(map.current, marker);
          onFieldSelect?.(field.id);
        });

        markersRef.current.push({ marker, infoWindow });
        bounds.extend(position);
      }
    });

    // Ajuster la vue pour montrer tous les marqueurs
    if (hasValidCoordinates && markersRef.current.length > 0) {
      if (markersRef.current.length === 1) {
        map.current.setCenter(bounds.getCenter());
        map.current.setZoom(15);
      } else {
        map.current.fitBounds(bounds);
        
        // Éviter un zoom trop important
        const listener = window.google.maps.event.addListenerOnce(map.current, 'bounds_changed', () => {
          if (map.current.getZoom() > 15) {
            map.current.setZoom(15);
          }
        });
      }
    }
  }, [fields, isLoaded, onFieldSelect]);

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
      <div ref={mapContainer} className="absolute inset-0" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <div className="text-gray-600">Chargement de Google Maps...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;
