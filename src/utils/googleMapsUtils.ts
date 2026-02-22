// Déclaration globale pour Google Maps
declare global {
  interface Window {
    google: any;
    initMap?: () => void;
  }
}

// Utilitaires pour Google Maps

export interface GoogleMapsConfig {
  center: { lat: number; lng: number };
  zoom: number;
  styles: any[];
}

// Configuration par défaut pour Abidjan
export const ABIDJAN_CONFIG: GoogleMapsConfig = {
  center: { lat: 5.347, lng: -3.996 },
  zoom: 11,
  styles: []
};

// Styles personnalisés pour MySport (temporairement simplifiés)
export const MYSPORT_MAP_STYLES = [
  // Styles temporairement désactivés pour le diagnostic
];

// Clé API Google Maps
export const GOOGLE_MAPS_API_KEY = 'AIzaSyCNNLn7HVkUSRlrWn2Qsz_0aEQP99j7LLs';

// Fonction pour charger Google Maps de manière asynchrone avec un meilleur debugging
export const loadGoogleMaps = (apiKey: string = GOOGLE_MAPS_API_KEY): Promise<any> => {
  return new Promise((resolve, reject) => {
    console.log('🔄 loadGoogleMaps: Début du chargement...');
    
    if (window.google && window.google.maps) {
      console.log('✅ loadGoogleMaps: Google Maps déjà chargé');
      resolve(window.google);
      return;
    }

    // Vérifier si un script est déjà en cours de chargement
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('⏳ loadGoogleMaps: Script déjà en cours de chargement, attente...');
      
      // Attendre que le script existant se charge
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkLoaded);
          console.log('✅ loadGoogleMaps: Google Maps chargé par script existant');
          resolve(window.google);
        }
      }, 100);
      
      // Timeout après 10 secondes
      setTimeout(() => {
        clearInterval(checkLoaded);
        reject(new Error('Timeout lors du chargement de Google Maps'));
      }, 10000);
      
      return;
    }

    console.log('📦 loadGoogleMaps: Création du script...');
    
    const script = document.createElement('script');
    const callbackName = 'initGoogleMapsCallback_' + Date.now();
    
    // Créer une fonction callback unique
    (window as any)[callbackName] = () => {
      console.log('🎉 loadGoogleMaps: Callback exécuté');
      
      if (window.google && window.google.maps) {
        console.log('✅ loadGoogleMaps: Google Maps chargé avec succès');
        // Nettoyer la fonction callback
        delete (window as any)[callbackName];
        resolve(window.google);
      } else {
        console.error('❌ loadGoogleMaps: Google Maps non disponible après callback');
        reject(new Error('Google Maps API failed to load properly'));
      }
    };
    
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    
    script.onerror = (error) => {
      console.error('❌ loadGoogleMaps: Erreur de chargement du script:', error);
      delete (window as any)[callbackName];
      reject(new Error('Failed to load Google Maps script'));
    };
    
    console.log('🌐 loadGoogleMaps: Ajout du script au DOM');
    document.head.appendChild(script);
  });
};

// Fonction de géocodage améliorée pour convertir une adresse en coordonnées
export const geocodeAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
  // Vérification que Google Maps est disponible
  if (!window.google || !window.google.maps || !window.google.maps.Geocoder) {
    console.warn('⚠️ Google Maps API ou Geocoder non disponible');
    return null;
  }

  const geocoder = new window.google.maps.Geocoder();
  
  try {
    console.log('🔍 Géocodage de:', address);
    
    const results = await new Promise((resolve, reject) => {
      geocoder.geocode({ 
        address,
        region: 'CI', // Priorité à la Côte d'Ivoire
        language: 'fr' // Réponses en français
      }, (results: any, status: any) => {
        console.log('📍 Statut géocodage:', status);
        
        if (status === 'OK' && results && results.length > 0) {
          console.log('✅ Résultats géocodage:', results);
          resolve(results);
        } else {
          const errorMsg = status === 'ZERO_RESULTS' 
            ? 'Aucun résultat trouvé pour cette adresse'
            : status === 'OVER_QUERY_LIMIT'
            ? 'Limite de requêtes atteinte, réessayez plus tard'
            : status === 'REQUEST_DENIED'
            ? 'Requête refusée par Google Maps'
            : status === 'INVALID_REQUEST'
            ? 'Requête invalide'
            : `Échec du géocodage: ${status}`;
          
          console.warn('⚠️', errorMsg);
          reject(new Error(errorMsg));
        }
      });
    });

    const result = (results as any)[0];
    const location = result.geometry.location;
    const coordinates = {
      lat: location.lat(),
      lng: location.lng()
    };
    
    console.log('✅ Coordonnées extraites:', coordinates);
    console.log('📍 Adresse formatée:', result.formatted_address);
    
    return coordinates;
    
  } catch (error) {
    console.error('❌ Erreur de géocodage:', error);
    return null;
  }
};

// Fonction de géocodage inverse pour convertir des coordonnées en adresse
export const reverseGeocode = async (latitude: number, longitude: number): Promise<string | null> => {
  // Vérification que Google Maps est disponible
  if (!window.google || !window.google.maps || !window.google.maps.Geocoder) {
    console.warn('⚠️ Google Maps API ou Geocoder non disponible');
    return null;
  }

  const geocoder = new window.google.maps.Geocoder();
  
  try {
    console.log('🔍 Géocodage inverse de:', { latitude, longitude });
    
    const results = await new Promise((resolve, reject) => {
      geocoder.geocode({ 
        location: { lat: latitude, lng: longitude },
        language: 'fr' // Réponses en français
      }, (results: any, status: any) => {
        console.log('📍 Statut géocodage inverse:', status);
        
        if (status === 'OK' && results && results.length > 0) {
          console.log('✅ Résultats géocodage inverse:', results);
          resolve(results);
        } else {
          const errorMsg = status === 'ZERO_RESULTS' 
            ? 'Aucune adresse trouvée pour ces coordonnées'
            : `Échec du géocodage inverse: ${status}`;
          
          console.warn('⚠️', errorMsg);
          reject(new Error(errorMsg));
        }
      });
    });

    const result = (results as any)[0];
    const formattedAddress = result.formatted_address;
    
    console.log('✅ Adresse formatée:', formattedAddress);
    
    return formattedAddress;
    
  } catch (error) {
    console.error('❌ Erreur de géocodage inverse:', error);
    return null;
  }
};

// Fonction de reverse geocoding via l'API REST (plus fiable que le SDK JS)
export const reverseGeocodeREST = async (
  latitude: number,
  longitude: number
): Promise<string | null> => {
  try {
    console.log('🔍 Reverse geocoding REST pour:', { latitude, longitude });
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&language=fr&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();

    if (data.status === 'OK' && data.results?.length > 0) {
      const addr = data.results[0].formatted_address;
      console.log('✅ Reverse geocoding REST réussi:', addr);
      return addr;
    }

    console.warn('⚠️ Reverse geocoding REST échoué:', data.status, data.error_message);
    return null;
  } catch (error) {
    console.error('❌ Erreur reverse geocoding REST:', error);
    return null;
  }
};

// Fonction pour créer un marqueur personnalisé
export const createCustomMarker = (field: any) => {
  // Vérification que Google Maps est disponible
  if (!window.google || !window.google.maps) {
    console.warn('Google Maps API not loaded yet');
    return null;
  }

  return {
    position: { lat: field.latitude, lng: field.longitude },
    icon: {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: '#16a34a',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    },
    title: field.name,
  };
};

// Fonction pour créer le contenu de l'InfoWindow
export const createInfoWindowContent = (field: any): string => {
  return `
    <div style="padding: 12px; min-width: 220px; font-family: system-ui, -apple-system, sans-serif;">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827;">${field.name}</h3>
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #6b7280; display: flex; align-items: center;">
        <span style="margin-right: 4px;">📍</span> ${field.location}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #16a34a;">
        ${field.price.toLocaleString()} XOF/heure
      </p>
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center;">
          <span style="color: #fbbf24; margin-right: 4px; font-size: 14px;">★</span>
          <span style="font-size: 13px; color: #374151;">${field.rating}</span>
        </div>
        <div style="font-size: 12px; color: #6b7280;">
          ${field.reviews || 0} avis
        </div>
      </div>
    </div>
  `;
};

// Fonction pour créer des clusters de marqueurs
export const createMarkerCluster = (map: any, markers: any[]) => {
  if (!window.google || !window.google.maps) {
    console.warn('Google Maps API not loaded yet');
    return null;
  }

  // Configuration du clusterer simple
  const clusters: any[] = [];
  const clusterDistance = 50; // Distance en pixels pour regrouper les marqueurs

  // Fonction pour calculer la distance entre deux points sur la carte
  const getPixelDistance = (marker1: any, marker2: any) => {
    const projection = map.getProjection();
    if (!projection) return Infinity;

    const point1 = projection.fromLatLngToPoint(marker1.getPosition());
    const point2 = projection.fromLatLngToPoint(marker2.getPosition());
    
    const dx = (point1.x - point2.x) * Math.pow(2, map.getZoom());
    const dy = (point1.y - point2.y) * Math.pow(2, map.getZoom());
    
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Regrouper les marqueurs proches
  markers.forEach(marker => {
    let addedToCluster = false;
    
    for (const cluster of clusters) {
      if (getPixelDistance(marker, cluster.markers[0]) < clusterDistance) {
        cluster.markers.push(marker);
        addedToCluster = true;
        break;
      }
    }
    
    if (!addedToCluster) {
      clusters.push({
        markers: [marker],
        center: marker.getPosition()
      });
    }
  });

  // Créer les clusters visuels
  clusters.forEach(cluster => {
    if (cluster.markers.length > 1) {
      // Masquer les marqueurs individuels
      cluster.markers.forEach((marker: any) => marker.setVisible(false));
      
      // Créer un marqueur cluster
      const clusterMarker = new window.google.maps.Marker({
        position: cluster.center,
        map: map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 20,
          fillColor: '#16a34a',
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        label: {
          text: cluster.markers.length.toString(),
          color: 'white',
          fontWeight: 'bold',
          fontSize: '12px'
        }
      });

      // Ajouter un événement de clic pour zoomer sur le cluster
      clusterMarker.addListener('click', () => {
        const bounds = new window.google.maps.LatLngBounds();
        cluster.markers.forEach((marker: any) => {
          bounds.extend(marker.getPosition());
        });
        map.fitBounds(bounds);
        
        // Après le zoom, afficher les marqueurs individuels
        setTimeout(() => {
          cluster.markers.forEach((marker: any) => marker.setVisible(true));
          clusterMarker.setVisible(false);
        }, 500);
      });
    }
  });

  return clusters;
};
