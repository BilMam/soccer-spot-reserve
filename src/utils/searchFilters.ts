
import { supabase } from '@/integrations/supabase/client';
import { performIntelligentSearch, buildFallbackQuery } from './intelligentSearch';
import type { SearchFilters } from '@/types/search';

export const buildSearchQuery = async (
  location: string,
  players: string,
  filters: SearchFilters
) => {
  console.log('🔍 Construction de la requête de recherche:', { location, players, filters });

  // Si on a une location, utiliser la recherche intelligente
  if (location && location.trim().length > 0) {
    try {
      console.log('🧠 Utilisation de la recherche intelligente');
      const results = await performIntelligentSearch(location.trim(), players, filters);
      return { data: results, error: null };
    } catch (error) {
      console.warn('🔄 Fallback vers recherche classique:', error);
      // En cas d'erreur, fallback vers l'ancienne méthode
      const fallbackQuery = buildFallbackQuery(location, players, filters);
      return await fallbackQuery;
    }
  }

  // Si pas de location, utiliser la méthode classique
  console.log('📋 Utilisation de la recherche classique (pas de location)');
  const fallbackQuery = buildFallbackQuery(location, players, filters);
  return await fallbackQuery;
};
