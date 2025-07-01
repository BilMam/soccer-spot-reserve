
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
    console.log('📊 Nombre total de terrains reçus:', fields.length);
    console.log('📋 Détails des terrains reçus:', fields.map(f => ({
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
        
        // ✅ CORRECTION : Créer un marqueur rouge plus visible
        const marker = new window.google.maps.Marker({
          position,
          map: map,
          title: field.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 18, // Taille plus importante
            fillColor: '#dc2626', // Rouge vif
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 4, // Contour plus épais
          },
          animation: window.google.maps.Animation.DROP,
          zIndex: 1000, // S'assurer que les marqueurs sont au-dessus
        });

        console.log('✅ Marqueur rouge créé pour:', field.name);

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

        // Effet de survol pour améliorer l'interactivité
        marker.addListener('mouseover', () => {
          marker.setIcon({
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 22, // Plus grand au survol
            fillColor: '#b91c1c', // Rouge plus foncé
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 4,
          });
        });

        marker.addListener('mouseout', () => {
          marker.setIcon({
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 18,
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
        console.error(`❌ Erreur création marqueur pour "${field.name}":`, error);
      }
    });

    console.log(`✅ ${markersCreated} marqueur(s) rouge(s) créé(s) avec succès`);

    // Ajuster la vue pour montrer tous les marqueurs
    if (markersCreated > 0) {
      console.log('🎯 Ajustement de la vue de la carte...');
      
      if (searchLocation) {
        console.log('🔍 Recherche spécifique, centrage avec zoom adapté');
        // Centrer sur la zone de recherche mais montrer les marqueurs
        if (markersCreated === 1) {
          const center = bounds.getCenter();
          map.setCenter(center);
          map.setZoom(15);
        } else {
          map.fitBounds(bounds);
          // Zoom adapté pour voir tous les marqueurs
          const listener = window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
            const currentZoom = map.getZoom();
            if (currentZoom > 14) {
              map.setZoom(14); // Zoom optimal pour voir les marqueurs
            }
          });
        }
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
          if (currentZoom > 14) {
            console.log('📏 Limitation du zoom à 14 pour une meilleure visibilité');
            map.setZoom(14);
          }
        });
      }
    }

  }, [map, fields, onFieldSelect, searchLocation]);

  return null;
};

export default MapMarkers;
