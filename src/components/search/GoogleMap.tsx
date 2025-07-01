
import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadGoogleMaps, ABIDJAN_CONFIG, MYSPORT_MAP_STYLES, createInfoWindowContent, createMarkerCluster } from '@/utils/googleMapsUtils';
import { geocodeLocationQuery } from '@/utils/geocodingUtils';

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clustersRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

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
    
    // Écouter les changements de zoom pour recalculer les clusters
    map.current.addListener('zoom_changed', () => {
      if (markersRef.current.length > 0) {
        updateMarkerClusters();
      }
    });
    
    setIsLoaded(true);
    console.log('🗺️ Carte Google Maps initialisée avec succès');
  };

  // Centrer la carte sur la zone de recherche
  const centerMapOnSearchLocation = async (location: string) => {
    if (!map.current || !location) return;

    setIsGeocoding(true);
    try {
      const coordinates = await geocodeLocationQuery(location);
      if (coordinates) {
        map.current.setCenter(coordinates);
        map.current.setZoom(13);
        console.log('🎯 Carte centrée sur:', location, coordinates);
      }
    } catch (error) {
      console.error('Erreur centrage carte:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Fonction pour mettre à jour les clusters
  const updateMarkerClusters = () => {
    if (!map.current || markersRef.current.length === 0) return;

    // Nettoyer les anciens clusters
    clustersRef.current.forEach(cluster => {
      if (cluster.setMap) cluster.setMap(null);
    });
    clustersRef.current = [];

    // Créer de nouveaux clusters
    const markers = markersRef.current.map(item => item.marker);
    const clusters = createMarkerCluster(map.current, markers);
    
    if (clusters) {
      clustersRef.current = clusters;
    }
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

  // Centrer la carte quand la localisation de recherche change
  useEffect(() => {
    if (isLoaded && searchLocation) {
      centerMapOnSearchLocation(searchLocation);
    }
  }, [isLoaded, searchLocation]);

  // Gérer les marqueurs
  useEffect(() => {
    if (!map.current || !isLoaded || !window.google) return;

    console.log('📍 Mise à jour des marqueurs:', fields.length);

    // Supprimer les anciens marqueurs et clusters
    markersRef.current.forEach(item => item.marker.setMap(null));
    markersRef.current = [];
    
    clustersRef.current.forEach(cluster => {
      if (cluster.setMap) cluster.setMap(null);
    });
    clustersRef.current = [];

    if (fields.length === 0) return;

    // Filtrer les terrains avec des coordonnées valides
    const fieldsWithCoordinates = fields.filter(field => 
      field.latitude && field.longitude && 
      !isNaN(field.latitude) && !isNaN(field.longitude)
    );

    console.log('📍 Terrains avec coordonnées:', fieldsWithCoordinates.length);

    if (fieldsWithCoordinates.length === 0) {
      console.warn('⚠️ Aucun terrain avec coordonnées GPS valides');
      return;
    }

    // Ajouter les nouveaux marqueurs
    const bounds = new window.google.maps.LatLngBounds();
    let hasValidCoordinates = false;

    fieldsWithCoordinates.forEach(field => {
      if (field.latitude && field.longitude) {
        hasValidCoordinates = true;
        
        const position = { lat: field.latitude, lng: field.longitude };
        
        // Créer un marqueur
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

    // Ajuster la vue pour montrer tous les marqueurs seulement s'il n'y a pas de recherche spécifique
    if (hasValidCoordinates && markersRef.current.length > 0 && !searchLocation) {
      if (markersRef.current.length === 1) {
        map.current.setCenter(bounds.getCenter());
        map.current.setZoom(15);
      } else {
        map.current.fitBounds(bounds);
        
        // Éviter un zoom trop important et créer les clusters
        const listener = window.google.maps.event.addListenerOnce(map.current, 'bounds_changed', () => {
          if (map.current.getZoom() > 15) {
            map.current.setZoom(15);
          }
          // Créer les clusters après le zoom
          setTimeout(() => {
            updateMarkerClusters();
          }, 100);
        });
      }
    } else if (hasValidCoordinates && markersRef.current.length > 0) {
      // Si il y a une recherche, créer les clusters directement
      setTimeout(() => {
        updateMarkerClusters();
      }, 100);
    }
  }, [fields, isLoaded, onFieldSelect, searchLocation]);

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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4</div>
            <div className="text-gray-600">Chargement de Google Maps...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;
