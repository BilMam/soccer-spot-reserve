
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

    console.log('📍 Début mise à jour des marqueurs');
    console.log('📊 Nombre total de terrains:', fields.length);
    console.log('📋 Détails des terrains:', fields.map(f => ({
      id: f.id,
      name: f.name,
      lat: f.latitude,
      lng: f.longitude,
      hasCoords: !!(f.latitude && f.longitude)
    })));

    // Supprimer les anciens marqueurs
    markersRef.current.forEach(item => {
      console.log('🗑️ Suppression ancien marqueur');
      item.marker.setMap(null);
    });
    markersRef.current = [];

    if (fields.length === 0) {
      console.log('⚠️ Aucun terrain à afficher');
      return;
    }

    // Filtrer les terrains avec des coordonnées valides
    const fieldsWithCoordinates = fields.filter(field => {
      const hasValidCoords = field.latitude && field.longitude && 
        !isNaN(field.latitude) && !isNaN(field.longitude);
      
      if (!hasValidCoords) {
        console.log(`⚠️ Terrain "${field.name}" sans coordonnées valides:`, {
          lat: field.latitude,
          lng: field.longitude
        });
      }
      
      return hasValidCoords;
    });

    console.log('✅ Terrains avec coordonnées valides:', fieldsWithCoordinates.length);

    if (fieldsWithCoordinates.length === 0) {
      console.warn('❌ Aucun terrain avec coordonnées GPS valides à afficher');
      return;
    }

    // Ajouter les nouveaux marqueurs
    const bounds = new window.google.maps.LatLngBounds();
    let markersCreated = 0;

    fieldsWithCoordinates.forEach((field, index) => {
      try {
        const position = { lat: field.latitude!, lng: field.longitude! };
        console.log(`📍 Création marqueur ${index + 1}/${fieldsWithCoordinates.length} pour "${field.name}":`, position);
        
        // Créer un marqueur avec une icône plus visible
        const marker = new window.google.maps.Marker({
          position,
          map: map,
          title: field.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 15, // Augmenté pour plus de visibilité
            fillColor: '#16a34a',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3, // Augmenté pour plus de visibilité
          },
          animation: window.google.maps.Animation.DROP, // Animation pour voir si le marqueur apparaît
        });

        console.log('✅ Marqueur créé pour:', field.name);

        // Créer une InfoWindow
        const infoWindow = new window.google.maps.InfoWindow({
          content: createInfoWindowContent(field)
        });

        // Événements du marqueur
        marker.addListener('click', () => {
          console.log('🖱️ Clic sur marqueur:', field.name);
          // Fermer toutes les autres InfoWindows
          markersRef.current.forEach(({ infoWindow: iw }) => iw?.close());
          infoWindow.open(map, marker);
          onFieldSelect?.(field.id);
        });

        markersRef.current.push({ marker, infoWindow });
        bounds.extend(position);
        markersCreated++;
        
      } catch (error) {
        console.error(`❌ Erreur création marqueur pour "${field.name}":`, error);
      }
    });

    console.log(`✅ ${markersCreated} marqueur(s) créé(s) avec succès`);

    // Ajuster la vue pour montrer tous les marqueurs
    if (markersCreated > 0) {
      console.log('🎯 Ajustement de la vue de la carte...');
      
      if (searchLocation) {
        console.log('🔍 Recherche spécifique, pas d\'ajustement automatique');
      } else if (markersCreated === 1) {
        const center = bounds.getCenter();
        console.log('📍 Un seul marqueur, centrage sur:', center.toJSON());
        map.setCenter(center);
        map.setZoom(15);
      } else {
        console.log('🗺️ Plusieurs marqueurs, ajustement des limites');
        map.fitBounds(bounds);
        
        // Éviter un zoom trop important
        const listener = window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
          const currentZoom = map.getZoom();
          console.log('🔍 Zoom après fitBounds:', currentZoom);
          if (currentZoom > 15) {
            console.log('📏 Limitation du zoom à 15');
            map.setZoom(15);
          }
        });
      }
    }

  }, [map, fields, onFieldSelect, searchLocation]);

  return null;
};

export default MapMarkers;
