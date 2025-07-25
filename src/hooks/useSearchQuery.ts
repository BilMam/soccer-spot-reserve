
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Field, UseSearchQueryProps } from '@/types/search';
import { checkFieldAvailability } from '@/utils/availabilityChecker';

// Fonction pour normaliser le texte (supprimer accents, apostrophes, etc.)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[''`]/g, '') // Supprimer les apostrophes
    .replace(/[^\w\s]/g, ' ') // Remplacer la ponctuation par des espaces
    .replace(/\s+/g, ' ') // Normaliser les espaces
    .trim();
};

// Fonction pour vérifier si une recherche correspond à un terrain
const matchesSearch = (field: any, searchQuery: string): boolean => {
  if (!searchQuery || searchQuery.trim().length === 0) return true;
  
  const normalizedSearch = normalizeText(searchQuery);
  const fieldText = normalizeText(`${field.name} ${field.location} ${field.address} ${field.city}`);
  
  console.log('🔍 Comparaison recherche:', {
    original: searchQuery,
    normalized: normalizedSearch,
    fieldText,
    matches: fieldText.includes(normalizedSearch)
  });
  
  // Vérifier si la recherche normalisée est contenue dans le texte du terrain
  if (fieldText.includes(normalizedSearch)) {
    return true;
  }
  
  // Recherche par mots-clés séparés
  const searchWords = normalizedSearch.split(' ').filter(w => w.length > 2);
  const matchedWords = searchWords.filter(word => fieldText.includes(word));
  
  console.log('🔍 Recherche par mots:', {
    searchWords,
    matchedWords,
    score: matchedWords.length / searchWords.length
  });
  
  // Si au moins 70% des mots correspondent
  return matchedWords.length / searchWords.length >= 0.7;
};

export const useSearchQuery = ({ location, date, timeSlot, players, filters }: UseSearchQueryProps) => {
  return useQuery({
    queryKey: ['fields', location, date, timeSlot, filters],
    queryFn: async () => {
      console.log('🔍 useSearchQuery - Paramètres de recherche:', { location, date, timeSlot, players, filters });
      
      // Récupérer TOUS les terrains actifs d'abord
      console.log('📋 Récupération de tous les terrains actifs...');
      const { data: allFields, error } = await supabase
        .from('fields')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (error) {
        console.error('❌ Erreur récupération terrains:', error);
        throw error;
      }

      console.log('📊 Terrains récupérés:', allFields?.length);

      // Convertir latitude et longitude en nombres et ajouter des logs détaillés
      const fieldsWithNumericCoords = allFields?.map(field => {
        const numericField = {
          ...field,
          latitude: field.latitude ? Number(field.latitude) : null,
          longitude: field.longitude ? Number(field.longitude) : null,
        };
        
        console.log(`🏟️ Terrain transformé ${field.name}:`, {
          originalLat: field.latitude,
          originalLng: field.longitude,
          numericLat: numericField.latitude,
          numericLng: numericField.longitude,
          latType: typeof numericField.latitude,
          lngType: typeof numericField.longitude,
          hasValidGPS: !!(numericField.latitude && numericField.longitude && 
            !isNaN(numericField.latitude) && !isNaN(numericField.longitude) &&
            numericField.latitude !== 0 && numericField.longitude !== 0)
        });
        
        return numericField;
      }) || [];

      if (fieldsWithNumericCoords.length === 0) {
        console.log('⚠️ Aucun terrain trouvé dans la base ou avec coordonnées valides après conversion');
        return [];
      }

      let filteredFields = fieldsWithNumericCoords;

      // Filtrer par localisation si spécifiée
      if (location && location.trim().length > 0) {
        console.log('🔍 Filtrage par localisation:', location);
        filteredFields = fieldsWithNumericCoords.filter(field => matchesSearch(field, location));
        console.log('📊 Terrains après filtrage localisation:', filteredFields.length);
      }

      // Appliquer les autres filtres
      filteredFields = filteredFields.filter((field: any) => {
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

      console.log('📊 Terrains après tous les filtres:', filteredFields.length);

      // Appliquer le tri
      if (filters.sortBy === 'price_asc') {
        filteredFields.sort((a, b) => a.price_per_hour - b.price_per_hour);
      } else if (filters.sortBy === 'price_desc') {
        filteredFields.sort((a, b) => b.price_per_hour - a.price_per_hour);
      } else {
        // Tri par rating par défaut
        filteredFields.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }

      // Si date et créneau horaire sont fournis, filtrer par disponibilité
      let finalFields = filteredFields;
      if (date && timeSlot && filteredFields?.length > 0) {
        console.log('⏰ Filtrage par disponibilité horaire...');
        finalFields = await checkFieldAvailability(filteredFields, date, timeSlot);
        console.log('✅ Terrains disponibles après filtrage horaire:', finalFields?.length);
      }

      // Logs finaux avec coordonnées GPS
      console.log('✅ Résultats finaux:', {
        total: finalFields?.length,
        withValidGPS: finalFields?.filter(f => 
          f.latitude && f.longitude && 
          !isNaN(Number(f.latitude)) && !isNaN(Number(f.longitude)) &&
          Number(f.latitude) !== 0 && Number(f.longitude) !== 0
        ).length,
        terrains: finalFields?.map(f => ({ 
          name: f.name, 
          hasValidGPS: !!(f.latitude && f.longitude && 
            !isNaN(Number(f.latitude)) && !isNaN(Number(f.longitude)) &&
            Number(f.latitude) !== 0 && Number(f.longitude) !== 0),
          coords: { lat: f.latitude, lng: f.longitude }
        }))
      });

      return finalFields as Field[];
    }
  });
};
