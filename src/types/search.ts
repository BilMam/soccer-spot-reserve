


export interface Field {
  id: string;
  name: string;
  location: string;
  address: string;
  city: string;
  
  // Type de sport
  sport_type: string; // Sera validé en BDD mais reste string côté TypeScript
  
  // Anciens champs (compatibilité)
  price_per_hour: number;
  price_1h30: number | null;
  price_2h: number | null;
  
  // Nouveaux champs avec valeurs par défaut
  net_price_1h: number;
  net_price_1h30: number | null;
  net_price_2h: number | null;
  public_price_1h: number;
  public_price_1h30: number | null;
  public_price_2h: number | null;
  commission_rate: number;  // Obligatoire avec défaut 0.03
  
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
  hold_preset_mode: string;
  preset_last_changed_at: string | null;
}

export interface SearchFilters {
  priceMin: string;
  priceMax: string;
  fieldType: string;
  capacity: string;
  sortBy: string;
  sport: string;
}

export interface UseSearchQueryProps {
  location: string;
  date: string;
  timeSlot: string;
  players: string;
  filters: SearchFilters;
}


