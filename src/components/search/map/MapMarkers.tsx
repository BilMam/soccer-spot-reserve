
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
    console.log('📊 Nombre total de terrains reçus:', fields.length);
    console.log('📋 Liste complète des terrains reçus:');
    fields.forEach((field, index) => {
      console.log(`  ${index + 1}. "${field.name}"`);
      console.log(`     - ID: ${field.id}`);
      console.log(`     - Latitude: ${field.latitude}`);
      console.log(`     - Longitude: ${field.longitude}`);
      console.log(`     - A des coordonnées: ${!!(field.latitude && field.longitude)}`);
      console.log(`     - Localisation: ${field.location}`);
      console.log('     ---');
    });

    // Supprimer les anciens marqueurs
    console.log('🗑️ Suppression des anciens marqueurs:', markersRef.current.length);
    markersRef.current.forEach(item => {
      item.marker.setMap(null);
    });
    markersRef.current = [];

    if (fields.length === 0) {
      console.log('⚠️ Aucun terrain à afficher - array vide');
      return;
    }

    // Filtrer les terrains avec des coordonnées valides
    const fieldsWithCoordinates = fields.filter(field => {
      const hasValidCoords = field.latitude && field.longitude && 
        !isNaN(field.latitude) && !isNaN(field.longitude) &&
        field.latitude !== 0 && field.longitude !== 0;
      
      if (!hasValidCoords) {
        console.log(`⚠️ Terrain "${field.name}" EXCLU - coordonnées invalides:`, {
          lat: field.latitude,
          lng: field.longitude,
          latType: typeof field.latitude,
          lngType: typeof field.longitude
        });
      } else {
        console.log(`✅ Terrain "${field.name}" INCLUS - coordonnées valides:`, {
          lat: field.latitude,
          lng: field.longitude
        });
      }
      
      return hasValidCoords;
    });

    console.log('📊 RÉSULTAT DU FILTRAGE:');
    console.log('  - Terrains total:', fields.length);
    console.log('  - Terrains avec coordonnées valides:', fieldsWithCoordinates.length);
    console.log('  - Terrains exclus:', fields.length - fieldsWithCoordinates.length);

    if (fieldsWithCoordinates.length === 0) {
      console.error('❌ AUCUN TERRAIN avec coordonnées GPS valides à afficher');
      console.log('💡 Vérifiez que les terrains sont bien géocodés dans la base de données');
      return;
    }

    // Ajouter les nouveaux marqueurs
    const bounds = new window.google.maps.LatLngBounds();
    let markersCreated = 0;

    console.log('📍 === CRÉATION DES MARQUEURS ===');
    fieldsWithCoordinates.forEach((field, index) => {
      try {
        const position = { lat: field.latitude!, lng: field.longitude! };
        console.log(`📍 Création marqueur ${index + 1}/${fieldsWithCoordinates.length}:`);
        console.log(`  - Terrain: "${field.name}"`);
        console.log(`  - Position: ${position.lat}, ${position.lng}`);
        
        // ✅ CORRECTION : Créer un marqueur rouge très visible
        const marker = new window.google.maps.Marker({
          position,
          map: map,
          title: field.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 20, // Marqueur plus grand
            fillColor: '#dc2626', // Rouge vif
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          animation: window.google.maps.Animation.DROP,
          zIndex: 1000,
        });

        console.log(`✅ Marqueur rouge créé avec succès pour: "${field.name}"`);

        // Créer une InfoWindow
        const infoWindow = new window.google.maps.InfoWindow({
          content: createInfoWindowContent(field)
        });

        // Événements du marqueur
        marker.addListener('click', () => {
          console.log(`🖱️ Clic sur marqueur: "${field.name}"`);
          // Fermer toutes les autres InfoWindows
          markersRef.current.forEach(({ infoWindow: iw }) => iw?.close());
          infoWindow.open(map, marker);
          onFieldSelect?.(field.id);
        });

        // Effet de survol
        marker.addListener('mouseover', () => {
          marker.setIcon({
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 24, // Plus grand au survol
            fillColor: '#b91c1c', // Rouge plus foncé
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          });
        });

        marker.addListener('mouseout', () => {
          marker.setIcon({
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 20,
            fillColor: '#dc2626',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
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
    console.log(`✅ ${markersCreated} marqueur(s) rouge(s) créé(s) avec succès`);
    console.log('📍 Marqueurs actifs sur la carte:', markersRef.current.length);

    // Ajuster la vue pour montrer tous les marqueurs
    if (markersCreated > 0) {
      console.log('🎯 Ajustement de la vue de la carte...');
      
      if (searchLocation) {
        console.log('🔍 Recherche spécifique, centrage avec zoom adapté');
        if (markersCreated === 1) {
          const center = bounds.getCenter();
          map.setCenter(center);
          map.setZoom(15);
          console.log('📍 Centrage sur marqueur unique:', center.toJSON());
        } else {
          map.fitBounds(bounds);
          const listener = window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
            const currentZoom = map.getZoom();
            if (currentZoom > 14) {
              map.setZoom(14);
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
    } else {
      console.error('❌ AUCUN MARQUEUR CRÉÉ - problème critique');
    }

    console.log('📍 === FIN MISE À JOUR DES MARQUEURS ===');

  }, [map, fields, onFieldSelect, searchLocation]);

  return null;
};

export default MapMarkers;
