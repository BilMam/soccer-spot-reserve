
// Déclaration globale pour Google Maps
declare global {
  interface Window {
    google: any;
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
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "on" }]
    },
    {
      featureType: "poi.business",
      stylers: [{ visibility: "on" }]
    },
    {
      featureType: "poi.sports_complex",
      stylers: [{ visibility: "on" }]
    },
    {
      featureType: "poi.park",
      stylers: [{ visibility: "on" }]
    }
  ]
};

// Styles personnalisés pour MySport
export const MYSPORT_MAP_STYLES = [
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#e9e9e9" }, { lightness: 17 }]
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#f5f5f5" }, { lightness: 20 }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.fill",
    stylers: [{ color: "#ffffff" }, { lightness: 17 }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#ffffff" }, { lightness: 29 }, { weight: 0.2 }]
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }, { lightness: 18 }]
  },
  {
    featureType: "road.local",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }, { lightness: 16 }]
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#f5f5f5" }, { lightness: 21 }]
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#dedede" }, { lightness: 21 }]
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ visibility: "on" }, { color: "#ffffff" }, { lightness: 16 }]
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ saturation: 36 }, { color: "#333333" }, { lightness: 40 }]
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#f2f2f2" }, { lightness: 19 }]
  },
  {
    featureType: "administrative",
    elementType: "geometry.fill",
    stylers: [{ color: "#fefefe" }, { lightness: 20 }]
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#fefefe" }, { lightness: 17 }, { weight: 1.2 }]
  }
];

// Clé API Google Maps
export const GOOGLE_MAPS_API_KEY = 'AIzaSyCNNLn7HVkUSRlrWn2Qsz_0aEQP99j7LLs';

// Fonction pour charger Google Maps de manière asynchrone
export const loadGoogleMaps = (apiKey: string = GOOGLE_MAPS_API_KEY): Promise<typeof google> => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve(window.google);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
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

// Fonction pour créer un marqueur personnalisé
export const createCustomMarker = (field: any) => {
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
