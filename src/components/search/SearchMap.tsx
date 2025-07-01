
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';

interface Field {
  id: string;
  name: string;
  location: string;
  price: number;
  rating: number;
  latitude?: number;
  longitude?: number;
}

interface SearchMapProps {
  fields: Field[];
  onFieldSelect?: (fieldId: string) => void;
}

const SearchMap: React.FC<SearchMapProps> = ({ fields, onFieldSelect }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Token Mapbox intégré
  const MAPBOX_TOKEN = 'pk.eyJ1IjoibWFtc2JpbCIsImEiOiJjbWNqcnE0bGowN3FlMm1za25ibGd4a3RhIn0.h4ayTwrTWhAZn95KnLWA9A';

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-3.996, 5.347], // Coordonnées d'Abidjan
      zoom: 11,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    const existingMarkers = document.querySelectorAll('.custom-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Add markers for fields with coordinates
    fields.forEach(field => {
      if (field.latitude && field.longitude) {
        // Create custom marker element
        const markerElement = document.createElement('div');
        markerElement.className = 'custom-marker';
        markerElement.innerHTML = `
          <div class="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-lg hover:bg-green-700 transition-colors cursor-pointer">
            ${field.price.toString().slice(0, 2)}k
          </div>
        `;

        // Create popup
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <h3 class="font-semibold text-sm">${field.name}</h3>
            <p class="text-xs text-gray-600">${field.location}</p>
            <p class="text-sm font-bold text-green-600">${field.price.toLocaleString()} XOF/h</p>
            <div class="flex items-center mt-1">
              <span class="text-yellow-400">★</span>
              <span class="text-xs ml-1">${field.rating}</span>
            </div>
          </div>
        `);

        // Add marker to map
        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([field.longitude, field.latitude])
          .setPopup(popup)
          .addTo(map.current!);

        // Handle marker click
        markerElement.addEventListener('click', () => {
          onFieldSelect?.(field.id);
        });
      }
    });

    // Adjust map bounds to show all markers
    if (fields.length > 0) {
      const coordinates = fields
        .filter(field => field.latitude && field.longitude)
        .map(field => [field.longitude!, field.latitude!]);

      if (coordinates.length > 0) {
        const bounds = coordinates.reduce((bounds, coord) => {
          return bounds.extend(coord as [number, number]);
        }, new mapboxgl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]));

        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15
        });
      }
    }
  }, [fields, mapLoaded, onFieldSelect]);

  return (
    <div className="relative w-full h-96 rounded-lg overflow-hidden shadow-md">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};

export default SearchMap;
