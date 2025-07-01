
import { useQuery } from '@tanstack/react-query';
import { performIntelligentSearch, buildFallbackQuery } from '@/utils/intelligentSearch';
import { checkFieldAvailability } from '@/utils/availabilityChecker';
import type { Field, UseSearchQueryProps } from '@/types/search';

export const useSearchQuery = ({ location, date, timeSlot, players, filters }: UseSearchQueryProps) => {
  return useQuery({
    queryKey: ['fields', location, date, timeSlot, filters],
    queryFn: async () => {
      console.log('🔍 useSearchQuery - Paramètres de recherche:', { location, date, timeSlot, players, filters });
      
      let allFields: Field[] = [];

      // Si on a une localisation, utiliser la recherche intelligente
      if (location && location.trim().length > 0) {
        console.log('🧠 Utilisation de la recherche intelligente pour:', location);
        allFields = await performIntelligentSearch(location, players, filters);
      } else {
        console.log('📋 Recherche par défaut - récupération de tous les terrains actifs');
        // Recherche par défaut : tous les terrains actifs (ne pas exiger GPS)
        const { data, error } = await buildFallbackQuery('', players, filters, false);
        
        if (error) {
          console.error('❌ Erreur recherche par défaut:', error);
          throw error;
        }
        
        allFields = data as Field[] || [];
      }

      console.log('📊 Terrains trouvés avant filtrage horaire:', allFields?.length);
      console.log('📍 Terrains avec coordonnées GPS:', allFields?.filter(f => f.latitude && f.longitude).length);
      
      // Afficher les détails des terrains pour debugging
      allFields?.forEach((field, index) => {
        console.log(`🏟️ Terrain ${index + 1}: "${field.name}" - GPS: ${field.latitude ? 'Oui' : 'Non'} (${field.latitude}, ${field.longitude})`);
      });

      // Si date et créneau horaire sont fournis, filtrer par disponibilité
      if (date && timeSlot && allFields?.length > 0) {
        console.log('⏰ Filtrage par disponibilité horaire...');
        const availableFields = await checkFieldAvailability(allFields, date, timeSlot);
        console.log('✅ Terrains disponibles après filtrage horaire:', availableFields?.length);
        return availableFields;
      }

      console.log('✅ Retour de tous les terrains trouvés:', allFields?.length);
      return allFields;
    }
  });
};
