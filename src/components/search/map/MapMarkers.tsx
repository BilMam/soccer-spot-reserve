
import React, { useEffect, useRef } from 'react';
import { createInfoWindowContent } from '@/utils/googleMapsUtils';

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

  useEffect(() => {
    if (!map || !window.google) {
      console.log('⚠️ Carte ou Google Maps non disponible pour les marqueurs');
      return;
    }

    console.log('📍 === DÉBUT MISE À JOUR DES MARQUEURS ===');
    console.log('📊 Données reçues dans MapMarkers:', {
      fieldsTotal: fields.length,
      mapExists: !!map,
      googleMapsLoaded: !!window.google?.maps,
      searchLocation
    });

    // Log détaillé de chaque terrain reçu
    fields.forEach((field, index) => {
      console.log(`🏟️ Terrain ${index + 1} - "${field.name}":`, {
        id: field.id,
        name: field.name,
        location: field.location,
        latitude: field.latitude,
        longitude: field.longitude,
        latType: typeof field.latitude,
        lngType: typeof field.longitude,
        hasValidCoords: !!(field.latitude && field.longitude && 
          !isNaN(Number(field.latitude)) && !isNaN(Number(field.longitude)) &&
          Number(field.latitude) !== 0 && Number(field.longitude) !== 0)
      });
    });

    // Supprimer les anciens marqueurs
    console.log('🗑️ Suppression des anciens marqueurs:', markersRef.current.length);
    markersRef.current.forEach(item => {
      if (item.marker) {
        item.marker.setMap(null);
      }
    });
    markersRef.current = [];

    if (fields.length === 0) {
      console.log('⚠️ Aucun terrain à afficher');
      return;
    }

    // Filtrer les terrains avec des coordonnées valides
    const fieldsWithCoordinates = fields.filter(field => {
      const lat = Number(field.latitude);
      const lng = Number(field.longitude);
      const hasValidCoords = field.latitude && field.longitude && 
        !isNaN(lat) && !isNaN(lng) &&
        lat !== 0 && lng !== 0 &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180;
      
      if (!hasValidCoords) {
        console.log(`❌ Terrain "${field.name}" EXCLU:`, {
          latitude: field.latitude,
          longitude: field.longitude,
          latNum: lat,
          lngNum: lng,
          reason: !field.latitude ? 'pas de latitude' :
                  !field.longitude ? 'pas de longitude' :
                  isNaN(lat) ? 'latitude non numérique' :
                  isNaN(lng) ? 'longitude non numérique' :
                  lat === 0 || lng === 0 ? 'coordonnées zéro' :
                  'coordonnées hors limites'
        });
      } else {
        console.log(`✅ Terrain "${field.name}" INCLUS:`, { lat, lng });
      }
      
      return hasValidCoords;
    });

    console.log('📊 RÉSULTAT DU FILTRAGE:');
    console.log(`  ✅ Terrains avec GPS valides: ${fieldsWithCoordinates.length}`);
    console.log(`  ❌ Terrains exclus: ${fields.length - fieldsWithCoordinates.length}`);

    if (fieldsWithCoordinates.length === 0) {
      console.error('❌ AUCUN TERRAIN avec coordonnées GPS valides');
      return;
    }

    // Créer les marqueurs
    const bounds = new window.google.maps.LatLngBounds();
    let markersCreated = 0;

    console.log('📍 === CRÉATION DES MARQUEURS ===');
    fieldsWithCoordinates.forEach((field, index) => {
      try {
        const lat = Number(field.latitude);
        const lng = Number(field.longitude);
        const position = { lat, lng };
        
        console.log(`📍 Création marqueur ${index + 1}/${fieldsWithCoordinates.length}:`);
        console.log(`  - Terrain: "${field.name}"`);
        console.log(`  - Position exacte: lat=${lat}, lng=${lng}`);
        
        // Créer un marqueur très visible
        const marker = new window.google.maps.Marker({
          position,
          map: map,
          title: field.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 25, // Plus grand
            fillColor: '#dc2626', // Rouge vif
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 4,
          },
          animation: window.google.maps.Animation.DROP,
          zIndex: 1000,
        });

        console.log(`✅ Marqueur rouge créé pour: "${field.name}" à ${lat}, ${lng}`);

        // InfoWindow
        const infoWindow = new window.google.maps.InfoWindow({
          content: createInfoWindowContent(field)
        });

        // Événements
        marker.addListener('click', () => {
          console.log(`🖱️ Clic sur marqueur: "${field.name}"`);
          markersRef.current.forEach(({ infoWindow: iw }) => iw?.close());
          infoWindow.open(map, marker);
          onFieldSelect?.(field.id);
        });

        // Effet survol
        marker.addListener('mouseover', () => {
          marker.setIcon({
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 30,
            fillColor: '#b91c1c',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 4,
          });
        });

        marker.addListener('mouseout', () => {
          marker.setIcon({
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 25,
            fillColor: '#dc2626',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 4,
          });
        });

        markersRef.current.push({ marker, infoWindow });
        bounds.extend(position);
        markersCreated++;
        
      } catch (error) {
        console.error(`❌ ERREUR création marqueur pour "${field.name}":`, error);
      }
    });

    console.log('📊 === RÉSULTAT CRÉATION MARQUEURS ===');
    console.log(`✅ ${markersCreated} marqueur(s) rouge(s) créé(s)`);
    console.log('📍 Marqueurs actifs:', markersRef.current.length);

    // Ajuster la vue
    if (markersCreated > 0) {
      console.log('🎯 Ajustement de la vue...');
      
      if (markersCreated === 1) {
        const center = bounds.getCenter();
        map.setCenter(center);
        map.setZoom(15);
        console.log('📍 Centré sur marqueur unique:', center.toJSON());
      } else {
        map.fitBounds(bounds);
        const listener = window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
          const currentZoom = map.getZoom();
          if (currentZoom > 14) {
            map.setZoom(14);
          }
        });
      }
    }

    console.log('📍 === FIN MISE À JOUR DES MARQUEURS ===');

  }, [map, fields, onFieldSelect, searchLocation]);

  return null;
};

export default MapMarkers;
