
import { supabase } from '@/integrations/supabase/client';
import type { SearchFilters } from '@/types/search';

export const buildSearchQuery = (
  location: string,
  players: string,
  filters: SearchFilters
) => {
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

  return query;
};
