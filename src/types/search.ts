

export interface Field {
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
  latitude?: number;
  longitude?: number;
  // Adding missing Supabase fields with correct required/optional status
  owner_id: string;
  description: string; // Made required to match Supabase schema
  availability_start: string;
  availability_end: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  currency: string;
}

export interface SearchFilters {
  priceMin: string;
  priceMax: string;
  fieldType: string;
  capacity: string;
  sortBy: string;
}

export interface UseSearchQueryProps {
  location: string;
  date: string;
  timeSlot: string;
  players: string;
  filters: SearchFilters;
}

