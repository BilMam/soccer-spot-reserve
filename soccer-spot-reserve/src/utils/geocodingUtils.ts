import { supabase } from '@/integrations/supabase/client';
import { geocodeAddress } from './googleMapsUtils';

export interface GeocodeExistingFieldsResult {
  success: number;
  failed: number;
  total: number;
  errors: string[];
}

// Mapping des quartiers d'Abidjan pour améliorer la recherche
const ABIDJAN_DISTRICTS = {
  'cocody': 'Cocody, Abidjan, Côte d\'Ivoire',
  'yopougon': 'Yopougon, Abidjan, Côte d\'Ivoire',
  'plateau': 'Plateau, Abidjan, Côte d\'Ivoire',
  'marcory': 'Marcory, Abidjan, Côte d\'Ivoire',
  'treichville': 'Treichville, Abidjan, Côte d\'Ivoire',
  'adjame': 'Adjamé, Abidjan, Côte d\'Ivoire',
  'abobo': 'Abobo, Abidjan, Côte d\'Ivoire',
  'koumassi': 'Koumassi, Abidjan, Côte d\'Ivoire',
  'port-bouet': 'Port-Bouët, Abidjan, Côte d\'Ivoire',
  'attécoubé': 'Attécoubé, Abidjan, Côte d\'Ivoire'
};

export const geocodeExistingFields = async (): Promise<GeocodeExistingFieldsResult> => {
  console.log('🔍 Démarrage du géocodage des terrains existants...');
  
  // Récupérer tous les terrains sans coordonnées GPS
  const { data: fieldsWithoutCoordinates, error: fetchError } = await supabase
    .from('fields')
    .select('id, name, address, city, latitude, longitude')
    .or('latitude.is.null,longitude.is.null');

  if (fetchError) {
    console.error('Erreur lors de la récupération des terrains:', fetchError);
    throw fetchError;
  }

  if (!fieldsWithoutCoordinates || fieldsWithoutCoordinates.length === 0) {
    console.log('✅ Tous les terrains ont déjà des coordonnées GPS');
    return { success: 0, failed: 0, total: 0, errors: [] };
  }

  console.log(`📍 ${fieldsWithoutCoordinates.length} terrains à géocoder`);

  const results = {
    success: 0,
    failed: 0,
    total: fieldsWithoutCoordinates.length,
    errors: [] as string[]
  };

  // Géocoder chaque terrain
  for (const field of fieldsWithoutCoordinates) {
    try {
      const fullAddress = `${field.address}, ${field.city}, Côte d'Ivoire`;
      console.log(`🔍 Géocodage de "${field.name}": ${fullAddress}`);
      
      const coordinates = await geocodeAddress(fullAddress);
      
      if (coordinates) {
        // Mettre à jour le terrain avec les coordonnées
        const { error: updateError } = await supabase
          .from('fields')
          .update({
            latitude: coordinates.lat,
            longitude: coordinates.lng
          })
          .eq('id', field.id);

        if (updateError) {
          console.error(`Erreur mise à jour terrain ${field.name}:`, updateError);
          results.failed++;
          results.errors.push(`${field.name}: Erreur de mise à jour`);
        } else {
          console.log(`✅ Terrain "${field.name}" géocodé avec succès`);
          results.success++;
        }
      } else {
        console.warn(`⚠️ Impossible de géocoder "${field.name}"`);
        results.failed++;
        results.errors.push(`${field.name}: Adresse non trouvée`);
      }

      // Petite pause pour éviter de surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`Erreur géocodage terrain ${field.name}:`, error);
      results.failed++;
      results.errors.push(`${field.name}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  console.log('📊 Résultat du géocodage:', results);
  return results;
};

export const geocodeLocationQuery = async (location: string): Promise<{lat: number, lng: number} | null> => {
  console.log('🔍 Géocodage de la zone de recherche:', location);
  
  // Normaliser la recherche pour les quartiers d'Abidjan
  const normalizedLocation = location.toLowerCase().trim();
  
  // ✅ CORRECTION : Améliorer la recherche des quartiers d'Abidjan
  let searchAddress = location;
  if (ABIDJAN_DISTRICTS[normalizedLocation as keyof typeof ABIDJAN_DISTRICTS]) {
    searchAddress = ABIDJAN_DISTRICTS[normalizedLocation as keyof typeof ABIDJAN_DISTRICTS];
    console.log(`🏘️ Quartier d'Abidjan détecté: ${location} -> ${searchAddress}`);
  } else if (!location.includes('Côte d\'Ivoire') && !location.includes('Abidjan')) {
    // Si ce n'est pas un quartier connu, essayer avec Abidjan
    searchAddress = `${location}, Abidjan, Côte d'Ivoire`;
  }
  
  try {
    console.log(`🔍 Recherche géographique pour: "${searchAddress}"`);
    const coordinates = await geocodeAddress(searchAddress);
    
    if (coordinates) {
      console.log('✅ Zone de recherche géocodée:', coordinates);
      return coordinates;
    } else {
      console.warn('⚠️ Impossible de géocoder la zone de recherche');
      return null;
    }
  } catch (error) {
    console.error('❌ Erreur géocodage zone de recherche:', error);
    return null;
  }
};

export const calculateDistance = (
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance en km
};

export const filterFieldsByDistance = (
  fields: any[], 
  centerLat: number, 
  centerLng: number, 
  maxDistanceKm: number = 10
) => {
  return fields.filter(field => {
    if (!field.latitude || !field.longitude) return false;
    
    const distance = calculateDistance(
      centerLat, 
      centerLng, 
      field.latitude, 
      field.longitude
    );
    
    return distance <= maxDistanceKm;
  });
};
