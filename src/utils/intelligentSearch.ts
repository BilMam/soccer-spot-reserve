
import { supabase } from '@/integrations/supabase/client';
import type { Field, SearchFilters } from '@/types/search';

// Cette fonction est maintenant simplifiée et utilise une recherche directe
export const performIntelligentSearch = async (
  location: string,
  players: string,
  filters: SearchFilters
): Promise<Field[]> => {
  console.log('🧠 Recherche intelligente simplifiée avec:', { location, players, filters });
  
  // Utiliser directement la recherche fallback qui fonctionne
  return await performFallbackSearch(location, players, filters);
};

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

  // Recherche textuelle améliorée pour les noms avec apostrophes
  if (location && location.trim().length > 0) {
    console.log('🔍 Ajout des filtres de localisation pour:', location);
    
    // Créer plusieurs variantes de recherche pour gérer les apostrophes
    const normalizedLocation = location.toLowerCase().trim();
    const searchTerms = [];
    
    // Recherche standard
    searchTerms.push(`name.ilike.%${location}%`);
    searchTerms.push(`city.ilike.%${location}%`);
    searchTerms.push(`location.ilike.%${location}%`);
    searchTerms.push(`address.ilike.%${location}%`);
    
    // Recherche avec variantes d'apostrophes
    if (location.includes("'") || location.includes("'")) {
      const withApostrophe = location.replace(/'/g, "'").replace(/'/g, "'");
      const withoutApostrophe = location.replace(/['']/g, "");
      
      searchTerms.push(`name.ilike.%${withApostrophe}%`);
      searchTerms.push(`name.ilike.%${withoutApostrophe}%`);
    }
    
    // Si c'est "Temple", "Foot", "Akouedo" - recherche par mots-clés
    const words = normalizedLocation.split(/\s+/).filter(w => w.length > 2);
    words.forEach(word => {
      searchTerms.push(`name.ilike.%${word}%`);
      searchTerms.push(`location.ilike.%${word}%`);
    });
    
    // Si c'est un quartier d'Abidjan, ajouter Abidjan
    const abidjancQuarters = ['cocody', 'yopougon', 'plateau', 'marcory', 'treichville', 'adjame', 'abobo', 'koumassi', 'akouedo'];
    if (abidjancQuarters.some(q => normalizedLocation.includes(q))) {
      searchTerms.push(`city.ilike.%Abidjan%`);
      searchTerms.push(`address.ilike.%Abidjan%`);
    }
    
    console.log('🔍 Termes de recherche générés:', searchTerms);
    query = query.or(searchTerms.join(','));
  }

  // Filtres de prix
  if (filters.priceMin) {
    query = query.gte('price_per_hour', parseFloat(filters.priceMin));
  }

  if (filters.priceMax) {
    query = query.lte('price_per_hour', parseFloat(filters.priceMax));
  }

  // Filtre par type de terrain
  if (filters.fieldType && filters.fieldType !== 'all') {
    query = query.eq('field_type', filters.fieldType);
  }

  // Filtres de capacité
  if (filters.capacity) {
    query = query.gte('capacity', parseInt(filters.capacity));
  }

  if (players) {
    query = query.gte('capacity', parseInt(players));
  }

  // Tri
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
