
export interface OwnerApplication {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  experience?: string;
  motivation?: string;
  status: string;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  user_email?: string;
}

export interface Field {
  id: string;
  name: string;
  location: string;
  field_type: string;
  capacity: number;
  price_per_hour: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}
