
import React, { useEffect, useRef } from 'react';
import { createInfoWindowContent, createMarkerCluster } from '@/utils/googleMapsUtils';

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

interface MapMarkersProps {
  map: any;
  fields: Field[];
  onFieldSelect?: (fieldId: string) => void;
  searchLocation?: string;
}

const MapMarkers: React.FC<MapMarkersProps> = ({ 
  map, 
  fields, 
  onFieldSelect, 
  searchLocation 
}) => {
  const markersRef = useRef<any[]>([]);
  const clustersRef = useRef<any[]>([]);

  // Fonction pour mettre à jour les clusters
  const updateMarkerClusters = () => {
    if (!map || markersRef.current.length === 0) return;

    // Nettoyer les anciens clusters
    clustersRef.current.forEach(cluster => {
      if (cluster.setMap) cluster.setMap(null);
    });
    clustersRef.current = [];

    // Créer de nouveaux clusters
    const markers = markersRef.current.map(item => item.marker);
    const clusters = createMarkerCluster(map, markers);
    
    if (clusters) {
      clustersRef.current = clusters;
    }
  };

  useEffect(() => {
    if (!map || !window.google) return;

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
          map: map,
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
          infoWindow.open(map, marker);
          onFieldSelect?.(field.id);
        });

        markersRef.current.push({ marker, infoWindow });
        bounds.extend(position);
      }
    });

    // Ajuster la vue pour montrer tous les marqueurs seulement s'il n'y a pas de recherche spécifique
    if (hasValidCoordinates && markersRef.current.length > 0 && !searchLocation) {
      if (markersRef.current.length === 1) {
        map.setCenter(bounds.getCenter());
        map.setZoom(15);
      } else {
        map.fitBounds(bounds);
        
        // Éviter un zoom trop important et créer les clusters
        const listener = window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
          if (map.getZoom() > 15) {
            map.setZoom(15);
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
  }, [map, fields, onFieldSelect, searchLocation]);

  // Écouter les changements de zoom pour recalculer les clusters
  useEffect(() => {
    if (!map) return;

    const zoomListener = map.addListener('zoom_changed', () => {
      if (markersRef.current.length > 0) {
        updateMarkerClusters();
      }
    });

    return () => {
      if (zoomListener) {
        window.google?.maps?.event?.removeListener(zoomListener);
      }
    };
  }, [map]);

  return null;
};

export default MapMarkers;
