export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      booking_notifications: {
        Row: {
          booking_id: string
          created_at: string | null
          error_message: string | null
          id: string
          notification_type: string
          recipient_email: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_type: string
          recipient_email: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string
          recipient_email?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmation_email_sent: boolean | null
          created_at: string | null
          end_time: string
          field_id: string
          id: string
          payment_intent_id: string | null
          payment_status: string | null
          player_count: number | null
          special_requests: string | null
          start_time: string
          status: string | null
          total_price: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_date: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmation_email_sent?: boolean | null
          created_at?: string | null
          end_time: string
          field_id: string
          id?: string
          payment_intent_id?: string | null
          payment_status?: string | null
          player_count?: number | null
          special_requests?: string | null
          start_time: string
          status?: string | null
          total_price: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_date?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmation_email_sent?: boolean | null
          created_at?: string | null
          end_time?: string
          field_id?: string
          id?: string
          payment_intent_id?: string | null
          payment_status?: string | null
          player_count?: number | null
          special_requests?: string | null
          start_time?: string
          status?: string | null
          total_price?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      field_availability: {
        Row: {
          created_at: string | null
          date: string
          end_time: string
          field_id: string
          id: string
          is_available: boolean | null
          price_override: number | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time: string
          field_id: string
          id?: string
          is_available?: boolean | null
          price_override?: number | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string
          field_id?: string
          id?: string
          is_available?: boolean | null
          price_override?: number | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_availability_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
        ]
      }
      fields: {
        Row: {
          address: string
          amenities: string[] | null
          availability_end: string | null
          availability_start: string | null
          capacity: number
          city: string
          created_at: string | null
          description: string | null
          field_type: string
          id: string
          images: string[] | null
          is_active: boolean | null
          location: string
          name: string
          owner_id: string
          price_per_hour: number
          rating: number | null
          total_reviews: number | null
          updated_at: string | null
        }
        Insert: {
          address: string
          amenities?: string[] | null
          availability_end?: string | null
          availability_start?: string | null
          capacity: number
          city: string
          created_at?: string | null
          description?: string | null
          field_type: string
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          location: string
          name: string
          owner_id: string
          price_per_hour: number
          rating?: number | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          amenities?: string[] | null
          availability_end?: string | null
          availability_start?: string | null
          capacity?: number
          city?: string
          created_at?: string | null
          description?: string | null
          field_type?: string
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          location?: string
          name?: string
          owner_id?: string
          price_per_hour?: number
          rating?: number | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fields_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_applications: {
        Row: {
          admin_notes: string | null
          created_at: string
          experience: string | null
          full_name: string
          id: string
          motivation: string | null
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          experience?: string | null
          full_name: string
          id?: string
          motivation?: string | null
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          experience?: string | null
          full_name?: string
          id?: string
          motivation?: string | null
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      owner_stats: {
        Row: {
          avg_rating: number | null
          confirmed_bookings: number | null
          field_id: string
          field_name: string
          owner_id: string
          pending_bookings: number | null
          total_bookings: number | null
          total_revenue: number | null
          total_reviews: number | null
          updated_at: string | null
        }
        Insert: {
          avg_rating?: number | null
          confirmed_bookings?: number | null
          field_id: string
          field_name: string
          owner_id: string
          pending_bookings?: number | null
          total_bookings?: number | null
          total_revenue?: number | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_rating?: number | null
          confirmed_bookings?: number | null
          field_id?: string
          field_name?: string
          owner_id?: string
          pending_bookings?: number | null
          total_bookings?: number | null
          total_revenue?: number | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_stats_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_stats_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
          user_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
          user_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string | null
          field_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string | null
          field_id: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string | null
          field_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_field: {
        Args: { field_id: string; notes?: string }
        Returns: undefined
      }
      approve_owner_application: {
        Args: { application_id: string; notes?: string }
        Returns: undefined
      }
      check_booking_conflict: {
        Args: {
          p_field_id: string
          p_booking_date: string
          p_start_time: string
          p_end_time: string
          p_booking_id?: string
        }
        Returns: boolean
      }
      get_all_owner_applications: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          full_name: string
          phone: string
          experience: string
          motivation: string
          status: string
          admin_notes: string
          reviewed_by: string
          reviewed_at: string
          created_at: string
          updated_at: string
          user_email: string
        }[]
      }
      get_owner_recent_bookings: {
        Args: { owner_uuid: string }
        Returns: {
          booking_id: string
          field_name: string
          user_name: string
          booking_date: string
          start_time: string
          end_time: string
          status: string
          total_price: number
          player_count: number
        }[]
      }
      get_user_owner_application: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          user_id: string
          full_name: string
          phone: string
          experience: string
          motivation: string
          status: string
          admin_notes: string
          reviewed_by: string
          reviewed_at: string
          created_at: string
          updated_at: string
        }[]
      }
      reject_owner_application: {
        Args: { application_id: string; notes: string }
        Returns: undefined
      }
      update_owner_stats_for_field: {
        Args: { field_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
