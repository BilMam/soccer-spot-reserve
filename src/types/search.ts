


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
  latitude: number | null;
  longitude: number | null;
  owner_id: string;
  description: string | null;
  availability_start: string | null;
  availability_end: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  currency: string;
  payout_account_id: string | null;
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


