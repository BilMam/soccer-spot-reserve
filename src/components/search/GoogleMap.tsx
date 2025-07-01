
import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

interface Field {
  id: string;
  name: string;
  location: string;
  price: number;
  rating: number;
  latitude?: number;
  longitude?: number;
}

interface GoogleMapProps {
  fields: Field[];
  onFieldSelect?: (fieldId: string) => void;
}

// Déclaration globale pour Google Maps
declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

const GoogleMap: React.FC<GoogleMapProps> = ({ fields, onFieldSelect }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showInput, setShowInput] = useState(true);
  const [error, setError] = useState('');

  // Fonction pour charger le script Google Maps
  const loadGoogleMapsScript = (key: string) => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve(window.google);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geometry,places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        if (window.google && window.google.maps) {
          resolve(window.google);
        } else {
          reject(new Error('Google Maps API failed to load'));
        }
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps script'));
      };
      
      document.head.appendChild(script);
    });
  };

  // Initialiser la carte
  const initializeMap = () => {
    if (!mapContainer.current || !window.google) return;

    // Configuration de la carte centrée sur Abidjan
    const mapOptions = {
      center: { lat: 5.347, lng: -3.996 },
      zoom: 11,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "on" }]
        },
        {
          featureType: "poi.business",
          stylers: [{ visibility: "on" }]
        }
      ],
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
    };

    map.current = new window.google.maps.Map(mapContainer.current, mapOptions);
    setIsLoaded(true);
  };

  // Charger Google Maps quand la clé API est fournie
  useEffect(() => {
    if (apiKey && !isLoaded) {
      loadGoogleMapsScript(apiKey)
        .then(() => {
          initializeMap();
          setError('');
          setShowInput(false);
        })
        .catch((err) => {
          console.error('Erreur chargement Google Maps:', err);
          setError('Erreur lors du chargement de Google Maps. Vérifiez votre clé API.');
        });
    }
  }, [apiKey, isLoaded]);

  // Gérer les marqueurs
  useEffect(() => {
    if (!map.current || !isLoaded || !window.google) return;

    // Supprimer les anciens marqueurs
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

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
          content: `
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">${field.name}</h3>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${field.location}</p>
              <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #16a34a;">
                ${field.price.toLocaleString()} XOF/h
              </p>
              <div style="display: flex; align-items: center; margin-top: 4px;">
                <span style="color: #fbbf24; margin-right: 4px;">★</span>
                <span style="font-size: 12px;">${field.rating}</span>
              </div>
            </div>
          `
        });

        // Événements du marqueur
        marker.addListener('click', () => {
          infoWindow.open(map.current, marker);
          onFieldSelect?.(field.id);
        });

        markersRef.current.push(marker);
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

  const handleApiKeySubmit = () => {
    if (apiKey.trim()) {
      setError('');
      // La carte sera initialisée par l'effet useEffect
    } else {
      setError('Veuillez entrer une clé API valide');
    }
  };

  if (showInput) {
    return (
      <Card className="p-8 text-center">
        <div className="space-y-6">
          <div>
            <MapPin className="w-12 h-12 mx-auto text-green-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Configuration Google Maps</h3>
            <p className="text-gray-600 text-sm">
              Pour afficher la carte interactive, veuillez entrer votre clé API Google Maps.
            </p>
          </div>
          
          <div className="max-w-md mx-auto space-y-4">
            <Input
              type="password"
              placeholder="Clé API Google Maps"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full"
            />
            
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            
            <Button 
              onClick={handleApiKeySubmit}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Charger la carte
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 space-y-1">
            <p>
              <a 
                href="https://console.cloud.google.com/google/maps-apis" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-600 hover:underline"
              >
                Obtenir une clé API Google Maps
              </a>
            </p>
            <p>Assurez-vous d'activer les APIs Maps JavaScript et Places</p>
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
          <div className="text-gray-600">Chargement de la carte...</div>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;
