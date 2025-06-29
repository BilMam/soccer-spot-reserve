
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseTimeSlot } from '@/utils/timeSlotParser';
import { timeToMinutes, minutesToTime } from '@/utils/timeUtils';

interface Field {
  id: string;
  name: string;
  location: string;
  address: string;
  city: string;
  price_per_hour: number;
  rating: number;
  total_reviews: number;
  images: string[];
  amenities: string[];
  capacity: number;
  field_type: string;
}

interface SearchFilters {
  priceMin: string;
  priceMax: string;
  fieldType: string;
  capacity: string;
  sortBy: string;
}

interface UseSearchQueryProps {
  location: string;
  date: string;
  timeSlot: string;
  players: string;
  filters: SearchFilters;
}

export const useSearchQuery = ({ location, date, timeSlot, players, filters }: UseSearchQueryProps) => {
  return useQuery({
    queryKey: ['fields', location, date, timeSlot, filters],
    queryFn: async () => {
      console.log('🔍 Recherche avec paramètres:', { location, date, timeSlot });
      
      // Parse time slot if provided
      const parsedTimeSlot = timeSlot ? parseTimeSlot(timeSlot) : null;
      console.log('🔍 Créneau parsé:', parsedTimeSlot);

      let query = supabase
        .from('fields')
        .select('*')
        .eq('is_active', true);

      // Location filter
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

      const { data: allFields, error } = await query;
      if (error) throw error;

      console.log('🔍 Terrains trouvés avant filtrage horaire:', allFields?.length);

      // If date and time slot are provided, filter by availability
      if (date && parsedTimeSlot && parsedTimeSlot.isValid) {
        const availableFields = [];
        
        for (const field of allFields || []) {
          console.log(`🔍 Vérification terrain: ${field.name}`);
          
          // Générer tous les créneaux de 30 min requis
          const requiredSlots = [];
          const startMinutes = timeToMinutes(parsedTimeSlot.startTime);
          const endMinutes = timeToMinutes(parsedTimeSlot.endTime);
          
          for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
            const slotStart = minutesToTime(minutes);
            const slotEnd = minutesToTime(minutes + 30);
            requiredSlots.push({ start: slotStart, end: slotEnd });
          }
          
          console.log(`🔍 Créneaux requis pour ${field.name}:`, requiredSlots);

          // Vérifier la disponibilité de chaque créneau requis - LOGIQUE STRICTE
          let isFieldAvailable = true;
          
          for (const slot of requiredSlots) {
            console.log(`🔍 Vérification créneau ${slot.start}-${slot.end} pour ${field.name}`);
            
            // Récupérer le créneau spécifique
            const { data: availableSlot, error: slotError } = await supabase
              .from('field_availability')
              .select('*')
              .eq('field_id', field.id)
              .eq('date', date)
              .eq('start_time', slot.start + ':00')
              .eq('end_time', slot.end + ':00')
              .maybeSingle();

            if (slotError) {
              console.log(`🔍 ❌ Erreur lors de la vérification du créneau ${slot.start}-${slot.end} pour ${field.name}:`, slotError);
              isFieldAvailable = false;
              break; // Sortir immédiatement si erreur
            }

            // LOGIQUE STRICTE: Le créneau DOIT exister ET être disponible
            if (!availableSlot) {
              console.log(`🔍 ❌ Créneau ${slot.start}-${slot.end} INEXISTANT pour ${field.name}`);
              isFieldAvailable = false;
              break; // Sortir immédiatement si créneau inexistant
            }

            if (!availableSlot.is_available) {
              console.log(`🔍 ❌ Créneau ${slot.start}-${slot.end} INDISPONIBLE pour ${field.name} (is_available: false)`);
              isFieldAvailable = false;
              break; // Sortir immédiatement si créneau indisponible
            }

            console.log(`🔍 ✅ Créneau ${slot.start}-${slot.end} disponible pour ${field.name}`);
          }

          // Vérifier les conflits de réservation SEULEMENT si tous les créneaux sont disponibles
          if (isFieldAvailable) {
            console.log(`🔍 Vérification des conflits de réservation pour ${field.name}`);
            
            const { data: conflictingBookings } = await supabase
              .from('bookings')
              .select('start_time, end_time')
              .eq('field_id', field.id)
              .eq('booking_date', date)
              .in('status', ['pending', 'confirmed', 'owner_confirmed'])
              .or(
                `and(start_time.lt.${parsedTimeSlot.endTime},end_time.gt.${parsedTimeSlot.startTime})`
              );

            if (conflictingBookings && conflictingBookings.length > 0) {
              console.log(`🔍 ❌ Conflit de réservation détecté pour ${field.name}:`, conflictingBookings);
              isFieldAvailable = false;
            } else {
              console.log(`🔍 ✅ Aucun conflit de réservation pour ${field.name}`);
            }
          }

          // Résultat final pour ce terrain
          if (isFieldAvailable) {
            console.log(`🔍 ✅ Terrain ${field.name} INCLUS dans les résultats`);
            availableFields.push(field);
          } else {
            console.log(`🔍 ❌ Terrain ${field.name} EXCLU des résultats`);
          }
        }

        console.log('🔍 Terrains disponibles après filtrage:', availableFields.length);
        return availableFields as Field[];
      }

      return allFields as Field[];
    }
  });
};
