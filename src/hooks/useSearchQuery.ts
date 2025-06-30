
import { useQuery } from '@tanstack/react-query';
import { buildSearchQuery } from '@/utils/searchFilters';
import { checkFieldAvailability } from '@/utils/availabilityChecker';
import type { Field, UseSearchQueryProps } from '@/types/search';

export const useSearchQuery = ({ location, date, timeSlot, players, filters }: UseSearchQueryProps) => {
  return useQuery({
    queryKey: ['fields', location, date, timeSlot, filters],
    queryFn: async () => {
      console.log('🔍 Recherche avec paramètres:', { location, date, timeSlot });
      
      const { data: allFields, error } = await buildSearchQuery(location, players, filters);
      
      if (error) throw error;

      console.log('🔍 Terrains trouvés avant filtrage horaire:', allFields?.length);

      // If date and time slot are provided, filter by availability
      if (date && timeSlot) {
        return await checkFieldAvailability(allFields || [], date, timeSlot);
      }

      return allFields as Field[];
    }
  });
};
