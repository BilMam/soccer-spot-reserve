
import { supabase } from '@/integrations/supabase/client';
import type { Field, SearchFilters } from '@/types/search';
import { geocodeLocationQuery, filterFieldsByDistance } from './geocodingUtils';

interface IntelligentSearchResult extends Field {
  relevance_score: number;
  distance?: number;
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
    searchCoordinates = await geocodeLocationQuery(location.trim());
  }

  // Étape 2: Recherche textuelle intelligente
  let query = supabase.rpc('intelligent_field_search', {
    search_query: location || '',
    similarity_threshold: 0.2
  });

  const { data: intelligentResults, error } = await query;

  if (error) {
    console.error('Erreur recherche intelligente:', error);
    throw error;
  }

  console.log('🧠 Résultats bruts recherche intelligente:', intelligentResults?.length);

  if (!intelligentResults || intelligentResults.length === 0) {
    return [];
  }

  // Étape 3: Filtrer par distance géographique si on a des coordonnées
  let geographicallyFilteredResults = intelligentResults;
  if (searchCoordinates) {
    console.log('📍 Filtrage géographique autour de:', searchCoordinates);
    geographicallyFilteredResults = filterFieldsByDistance(
      intelligentResults, 
      searchCoordinates.lat, 
      searchCoordinates.lng, 
      15 // Rayon de 15km pour la recherche urbaine
    );
    console.log('📍 Terrains dans la zone géographique:', geographicallyFilteredResults.length);
  }

  // Étape 4: Appliquer les filtres supplémentaires côté client
  let filteredResults = geographicallyFilteredResults.filter((field: IntelligentSearchResult) => {
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

  // Étape 5: Calculer la distance pour chaque terrain si on a des coordonnées de recherche
  if (searchCoordinates) {
    filteredResults = filteredResults.map((field: IntelligentSearchResult) => {
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

  // Étape 6: Appliquer le tri
  if (filters.sortBy === 'price_asc') {
    filteredResults.sort((a, b) => a.price_per_hour - b.price_per_hour);
  } else if (filters.sortBy === 'price_desc') {
    filteredResults.sort((a, b) => b.price_per_hour - a.price_per_hour);
  } else if (filters.sortBy === 'distance' && searchCoordinates) {
    filteredResults.sort((a, b) => (a.distance || 0) - (b.distance || 0));
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

  // Retourner sans le score de pertinence pour correspondre au type Field
  return filteredResults.map(({ relevance_score, distance, ...field }) => field as Field);
};

export const buildFallbackQuery = (
  location: string,
  players: string,
  filters: SearchFilters
) => {
  // Fallback vers l'ancienne méthode en cas d'échec
  let query = supabase
    .from('fields')
    .select('*')
    .eq('is_active', true)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null); // Filtrer les terrains sans coordonnées

  // Location filter (méthode classique)
  if (location) {
    query = query.or(`city.ilike.%${location}%,location.ilike.%${location}%,address.ilike.%${location}%`);
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

  return query;
};
