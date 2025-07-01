
import { supabase } from '@/integrations/supabase/client';
import type { Field, SearchFilters } from '@/types/search';
import { geocodeLocationQuery, filterFieldsByDistance } from './geocodingUtils';

interface IntelligentSearchResult extends Field {
  relevance_score: number;
  distance?: number;
  latitude?: number;
  longitude?: number;
}

export const performIntelligentSearch = async (
  location: string,
  players: string,
  filters: SearchFilters
): Promise<Field[]> => {
  console.log('🧠 Recherche intelligente avec:', { location, players, filters });

  // Étape 1: Géocoder la localisation de recherche pour obtenir les coordonnées
  let searchCoordinates: {lat: number, lng: number} | null = null;
  if (location && location.trim().length > 0) {
    console.log('🔍 Tentative de géocodage pour:', location);
    searchCoordinates = await geocodeLocationQuery(location.trim());
    if (searchCoordinates) {
      console.log('✅ Coordonnées trouvées pour la recherche:', searchCoordinates);
    } else {
      console.log('⚠️ Pas de coordonnées trouvées, recherche textuelle uniquement');
    }
  }

  // Étape 2: Recherche textuelle intelligente avec coordonnées GPS
  let query = supabase.rpc('intelligent_field_search', {
    search_query: location || '',
    similarity_threshold: 0.1 // Réduire le seuil pour plus de résultats
  });

  const { data: intelligentResults, error } = await query;

  if (error) {
    console.warn('⚠️ Erreur recherche intelligente, utilisation du fallback:', error);
    // Fallback vers la recherche standard
    return await performFallbackSearch(location, players, filters);
  }

  console.log('🧠 Résultats bruts recherche intelligente:', intelligentResults?.length);

  if (!intelligentResults || intelligentResults.length === 0) {
    console.log('📋 Aucun résultat intelligent, tentative de fallback...');
    return await performFallbackSearch(location, players, filters);
  }

  // Étape 3: Ajouter les coordonnées GPS des terrains depuis la base
  const resultsWithCoordinates = await Promise.all(
    intelligentResults.map(async (field: any) => {
      const { data: fieldData } = await supabase
        .from('fields')
        .select('latitude, longitude')
        .eq('id', field.id)
        .single();
      
      return {
        ...field,
        latitude: fieldData?.latitude || null,
        longitude: fieldData?.longitude || null
      };
    })
  );

  // Étape 4: Filtrer par distance géographique si on a des coordonnées (optionnel)
  let geographicallyFilteredResults = resultsWithCoordinates;
  if (searchCoordinates) {
    console.log('📍 Filtrage géographique autour de:', searchCoordinates);
    const fieldsWithCoordinates = resultsWithCoordinates.filter(f => f.latitude && f.longitude);
    const fieldsWithoutCoordinates = resultsWithCoordinates.filter(f => !f.latitude || !f.longitude);
    
    // ✅ CORRECTION : Augmenter le rayon de recherche pour Abidjan
    const geographicallyFiltered = filterFieldsByDistance(
      fieldsWithCoordinates, 
      searchCoordinates.lat, 
      searchCoordinates.lng, 
      25 // Augmenté à 25km pour couvrir tout Abidjan
    );
    
    // Combiner les résultats : terrains dans la zone + terrains sans coordonnées
    geographicallyFilteredResults = [...geographicallyFiltered, ...fieldsWithoutCoordinates];
    console.log('📍 Terrains dans la zone géographique (25km):', geographicallyFiltered.length);
    console.log('📍 Terrains sans coordonnées inclus:', fieldsWithoutCoordinates.length);
  }

  // Étape 5: Appliquer les filtres supplémentaires côté client
  let filteredResults: IntelligentSearchResult[] = geographicallyFilteredResults.filter((field: IntelligentSearchResult) => {
    // Filtre par prix minimum
    if (filters.priceMin && field.price_per_hour < parseFloat(filters.priceMin)) {
      return false;
    }

    // Filtre par prix maximum
    if (filters.priceMax && field.price_per_hour > parseFloat(filters.priceMax)) {
      return false;
    }

    // Filtre par type de terrain
    if (filters.fieldType && filters.fieldType !== 'all' && field.field_type !== filters.fieldType) {
      return false;
    }

    // Filtre par capacité
    if (filters.capacity && field.capacity < parseInt(filters.capacity)) {
      return false;
    }

    // Filtre par nombre de joueurs
    if (players && field.capacity < parseInt(players)) {
      return false;
    }

    return true;
  });

  // Étape 6: Calculer la distance pour chaque terrain si on a des coordonnées de recherche
  if (searchCoordinates) {
    filteredResults = filteredResults.map((field: IntelligentSearchResult): IntelligentSearchResult => {
      if (field.latitude && field.longitude) {
        const distance = Math.sqrt(
          Math.pow(field.latitude - searchCoordinates!.lat, 2) + 
          Math.pow(field.longitude - searchCoordinates!.lng, 2)
        ) * 111; // Conversion approximative en km
        
        return { ...field, distance };
      }
      return field;
    });
  }

  // Étape 7: Appliquer le tri
  if (filters.sortBy === 'price_asc') {
    filteredResults.sort((a, b) => a.price_per_hour - b.price_per_hour);
  } else if (filters.sortBy === 'price_desc') {
    filteredResults.sort((a, b) => b.price_per_hour - a.price_per_hour);
  } else if (filters.sortBy === 'distance' && searchCoordinates) {
    filteredResults.sort((a, b) => {
      // Terrains avec distance en premier, puis terrains sans coordonnées
      if (!a.distance && !b.distance) return 0;
      if (!a.distance) return 1;
      if (!b.distance) return -1;
      return a.distance - b.distance;
    });
  } else {
    // Tri par pertinence puis par rating
    filteredResults.sort((a, b) => {
      // D'abord par score de pertinence
      if (b.relevance_score !== a.relevance_score) {
        return b.relevance_score - a.relevance_score;
      }
      // Puis par rating
      return (b.rating || 0) - (a.rating || 0);
    });
  }

  console.log('🧠 Résultats finaux après filtrage:', filteredResults.length);

  // Retourner sans le score de pertinence et distance pour correspondre au type Field
  return filteredResults.map(({ relevance_score, distance, ...field }) => field as Field);
};

// Nouvelle fonction de fallback pour récupérer tous les terrains actifs
export const performFallbackSearch = async (
  location: string,
  players: string,
  filters: SearchFilters
): Promise<Field[]> => {
  console.log('🔄 Recherche de fallback avec:', { location, players, filters });
  
  const { data, error } = await buildFallbackQuery(location, players, filters, false);
  
  if (error) {
    console.error('❌ Erreur dans la recherche fallback:', error);
    throw error;
  }
  
  console.log('📋 Résultats fallback:', data?.length);
  return data as Field[] || [];
};

export const buildFallbackQuery = (
  location: string,
  players: string,
  filters: SearchFilters,
  requireGPS: boolean = false
) => {
  console.log('🔧 Construction requête fallback:', { location, players, filters, requireGPS });
  
  // Requête de base pour tous les terrains actifs
  let query = supabase
    .from('fields')
    .select('*')
    .eq('is_active', true);

  // Filtrer par coordonnées GPS seulement si requis
  if (requireGPS) {
    query = query
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);
  }

  // ✅ CORRECTION : Améliorer la recherche textuelle pour les quartiers
  if (location && location.trim().length > 0) {
    console.log('🔍 Ajout des filtres de localisation pour:', location);
    // Recherche élargie pour inclure les quartiers d'Abidjan
    const searchTerms = [
      `city.ilike.%${location}%`,
      `location.ilike.%${location}%`,
      `address.ilike.%${location}%`,
      `name.ilike.%${location}%`
    ];
    
    // Si c'est "Cocody" ou un quartier d'Abidjan, chercher aussi dans "Abidjan"
    const locationLower = location.toLowerCase();
    if (locationLower.includes('cocody') || locationLower.includes('yopougon') || 
        locationLower.includes('plateau') || locationLower.includes('marcory') ||
        locationLower.includes('treichville') || locationLower.includes('adjame') ||
        locationLower.includes('abobo') || locationLower.includes('koumassi')) {
      searchTerms.push(`city.ilike.%Abidjan%`);
      searchTerms.push(`address.ilike.%${location}%`);
    }
    
    query = query.or(searchTerms.join(','));
  }

  // Price filters
  if (filters.priceMin) {
    query = query.gte('price_per_hour', parseFloat(filters.priceMin));
  }

  if (filters.priceMax) {
    query = query.lte('price_per_hour', parseFloat(filters.priceMax));
  }

  // Field type filter
  if (filters.fieldType && filters.fieldType !== 'all') {
    query = query.eq('field_type', filters.fieldType);
  }

  // Capacity filters
  if (filters.capacity) {
    query = query.gte('capacity', parseInt(filters.capacity));
  }

  if (players) {
    query = query.gte('capacity', parseInt(players));
  }

  // Sorting
  if (filters.sortBy === 'price_asc') {
    query = query.order('price_per_hour', { ascending: true });
  } else if (filters.sortBy === 'price_desc') {
    query = query.order('price_per_hour', { ascending: false });
  } else {
    query = query.order('rating', { ascending: false });
  }

  console.log('✅ Requête fallback construite');
  return query;
};
