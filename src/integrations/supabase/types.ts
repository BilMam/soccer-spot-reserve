export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      availability_period_templates: {
        Row: {
          apply_pattern: string | null
          created_at: string | null
          created_by: string
          default_end_time: string
          default_start_time: string
          end_date: string
          excluded_days: number[] | null
          field_id: string
          id: string
          start_date: string
          template_name: string
          updated_at: string | null
        }
        Insert: {
          apply_pattern?: string | null
          created_at?: string | null
          created_by: string
          default_end_time: string
          default_start_time: string
          end_date: string
          excluded_days?: number[] | null
          field_id: string
          id?: string
          start_date: string
          template_name: string
          updated_at?: string | null
        }
        Update: {
          apply_pattern?: string | null
          created_at?: string | null
          created_by?: string
          default_end_time?: string
          default_start_time?: string
          end_date?: string
          excluded_days?: number[] | null
          field_id?: string
          id?: string
          start_date?: string
          template_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_period_templates_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_cron_stats: {
        Row: {
          cleaned_count: number
          created_at: string | null
          duration_ms: number
          id: string
          run_at: string | null
        }
        Insert: {
          cleaned_count?: number
          created_at?: string | null
          duration_ms?: number
          id?: string
          run_at?: string | null
        }
        Update: {
          cleaned_count?: number
          created_at?: string | null
          duration_ms?: number
          id?: string
          run_at?: string | null
        }
        Relationships: []
      }
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
          cinetpay_transfer_id: string | null
          confirmation_code: string | null
          confirmation_email_sent: boolean | null
          created_at: string | null
          currency: string | null
          end_time: string
          field_id: string
          field_price: number | null
          id: string
          owner_amount: number | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_status: string | null
          payout_sent: boolean | null
          platform_fee: number | null
          platform_fee_owner: number | null
          platform_fee_user: number | null
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
          cinetpay_transfer_id?: string | null
          confirmation_code?: string | null
          confirmation_email_sent?: boolean | null
          created_at?: string | null
          currency?: string | null
          end_time: string
          field_id: string
          field_price?: number | null
          id?: string
          owner_amount?: number | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          payout_sent?: boolean | null
          platform_fee?: number | null
          platform_fee_owner?: number | null
          platform_fee_user?: number | null
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
          cinetpay_transfer_id?: string | null
          confirmation_code?: string | null
          confirmation_email_sent?: boolean | null
          created_at?: string | null
          currency?: string | null
          end_time?: string
          field_id?: string
          field_price?: number | null
          id?: string
          owner_amount?: number | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          payout_sent?: boolean | null
          platform_fee?: number | null
          platform_fee_owner?: number | null
          platform_fee_user?: number | null
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
          created_by: string | null
          date: string
          end_time: string
          field_id: string
          id: string
          is_available: boolean | null
          is_maintenance: boolean | null
          notes: string | null
          period_template_id: string | null
          price_override: number | null
          start_time: string
          unavailability_reason: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date: string
          end_time: string
          field_id: string
          id?: string
          is_available?: boolean | null
          is_maintenance?: boolean | null
          notes?: string | null
          period_template_id?: string | null
          price_override?: number | null
          start_time: string
          unavailability_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          end_time?: string
          field_id?: string
          id?: string
          is_available?: boolean | null
          is_maintenance?: boolean | null
          notes?: string | null
          period_template_id?: string | null
          price_override?: number | null
          start_time?: string
          unavailability_reason?: string | null
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
          currency: string | null
          description: string | null
          field_type: string
          id: string
          images: string[] | null
          is_active: boolean | null
          latitude: number | null
          location: string
          longitude: number | null
          name: string
          owner_id: string
          payout_account_id: string | null
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
          currency?: string | null
          description?: string | null
          field_type: string
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          latitude?: number | null
          location: string
          longitude?: number | null
          name: string
          owner_id: string
          payout_account_id?: string | null
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
          currency?: string | null
          description?: string | null
          field_type?: string
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string
          owner_id?: string
          payout_account_id?: string | null
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
          {
            foreignKeyName: "fields_payout_account_id_fkey"
            columns: ["payout_account_id"]
            isOneToOne: false
            referencedRelation: "payout_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fields_owner"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["user_id"]
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
          phone_payout: string | null
          phone_verified_at: string | null
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
          phone_payout?: string | null
          phone_verified_at?: string | null
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
          phone_payout?: string | null
          phone_verified_at?: string | null
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
      owners: {
        Row: {
          created_at: string
          default_payout_account_id: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_payout_account_id?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_payout_account_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_owners_default_payout_account"
            columns: ["default_payout_account_id"]
            isOneToOne: false
            referencedRelation: "payout_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_accounts: {
        Row: {
          account_type: string | null
          cinetpay_contact_added: boolean | null
          cinetpay_contact_response: Json | null
          cinetpay_contact_status: Json | null
          country_prefix: string | null
          created_at: string
          email: string | null
          external_account_id: string | null
          id: string
          merchant_id: string | null
          owner_id: string
          owner_name: string | null
          owner_surname: string | null
          payment_provider: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          cinetpay_contact_added?: boolean | null
          cinetpay_contact_response?: Json | null
          cinetpay_contact_status?: Json | null
          country_prefix?: string | null
          created_at?: string
          email?: string | null
          external_account_id?: string | null
          id?: string
          merchant_id?: string | null
          owner_id: string
          owner_name?: string | null
          owner_surname?: string | null
          payment_provider?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          cinetpay_contact_added?: boolean | null
          cinetpay_contact_response?: Json | null
          cinetpay_contact_status?: Json | null
          country_prefix?: string | null
          created_at?: string
          email?: string | null
          external_account_id?: string | null
          id?: string
          merchant_id?: string | null
          owner_id?: string
          owner_name?: string | null
          owner_surname?: string | null
          payment_provider?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_anomalies: {
        Row: {
          amount: number
          created_at: string
          error_message: string
          error_type: string
          id: string
          payment_intent_id: string
          resolved_at: string | null
          webhook_data: Json | null
        }
        Insert: {
          amount: number
          created_at?: string
          error_message: string
          error_type: string
          id?: string
          payment_intent_id: string
          resolved_at?: string | null
          webhook_data?: Json | null
        }
        Update: {
          amount?: number
          created_at?: string
          error_message?: string
          error_type?: string
          id?: string
          payment_intent_id?: string
          resolved_at?: string | null
          webhook_data?: Json | null
        }
        Relationships: []
      }
      payout_accounts: {
        Row: {
          cinetpay_contact_id: string | null
          created_at: string
          id: string
          is_active: boolean
          label: string
          owner_id: string
          phone: string
          updated_at: string
        }
        Insert: {
          cinetpay_contact_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          owner_id: string
          phone: string
          updated_at?: string
        }
        Update: {
          cinetpay_contact_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          owner_id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pa_owner"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_accounts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          amount_net: number | null
          booking_id: string
          cinetpay_transfer_id: string | null
          created_at: string
          id: string
          owner_id: string
          platform_fee_owner: number
          sent_at: string | null
          status: string
          transfer_response: Json | null
          updated_at: string
        }
        Insert: {
          amount: number
          amount_net?: number | null
          booking_id: string
          cinetpay_transfer_id?: string | null
          created_at?: string
          id?: string
          owner_id: string
          platform_fee_owner: number
          sent_at?: string | null
          status?: string
          transfer_response?: Json | null
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_net?: number | null
          booking_id?: string
          cinetpay_transfer_id?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          platform_fee_owner?: number
          sent_at?: string | null
          status?: string
          transfer_response?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
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
      review_categories: {
        Row: {
          category: string
          created_at: string
          id: string
          rating: number
          review_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          rating: number
          review_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          rating?: number
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_categories_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_reminders: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reminders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
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
      role_audit_log: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_value: string | null
          old_value: string | null
          performed_by: string
          reason: string | null
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_value?: string | null
          old_value?: string | null
          performed_by: string
          reason?: string | null
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_value?: string | null
          old_value?: string | null
          performed_by?: string
          reason?: string | null
          target_user_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      sms_notifications: {
        Row: {
          booking_id: string | null
          content: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          message_type: string
          phone_number: string
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          content: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_type: string
          phone_number: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          content?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_type?: string
          phone_number?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_name: string
          badge_type: string
          description: string | null
          earned_at: string
          id: string
          is_visible: boolean | null
          user_id: string
        }
        Insert: {
          badge_name: string
          badge_type: string
          description?: string | null
          earned_at?: string
          id?: string
          is_visible?: boolean | null
          user_id: string
        }
        Update: {
          badge_name?: string
          badge_type?: string
          description?: string | null
          earned_at?: string
          id?: string
          is_visible?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          field_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          field_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          field_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          booking_confirmations: boolean | null
          created_at: string
          email_enabled: boolean | null
          id: string
          marketing_notifications: boolean | null
          push_enabled: boolean | null
          review_reminders: boolean | null
          sms_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_confirmations?: boolean | null
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          marketing_notifications?: boolean | null
          push_enabled?: boolean | null
          review_reminders?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_confirmations?: boolean | null
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          marketing_notifications?: boolean | null
          push_enabled?: boolean | null
          review_reminders?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          role: Database["public"]["Enums"]["user_role_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          role: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      award_reviewer_badge: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      calculate_search_similarity: {
        Args: { search_term: string; field_text: string }
        Returns: number
      }
      can_promote_user: {
        Args: {
          promoter_id: string
          target_role: Database["public"]["Enums"]["user_role_type"]
        }
        Returns: boolean
      }
      change_user_type: {
        Args: {
          target_user_id: string
          new_user_type: string
          new_role?: Database["public"]["Enums"]["user_role_type"]
          reason?: string
        }
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
      check_slot_booking_status: {
        Args: {
          p_field_id: string
          p_date: string
          p_start_time: string
          p_end_time: string
        }
        Returns: boolean
      }
      cleanup_expired_bookings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_availability_for_period: {
        Args: {
          p_field_id: string
          p_start_date: string
          p_end_date: string
          p_start_time: string
          p_end_time: string
          p_slot_duration?: number
          p_exclude_days?: number[]
          p_template_id?: string
        }
        Returns: number
      }
      generate_unique_confirmation_code: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      get_field_bookings: {
        Args: { p_field_id: string; p_start_date: string; p_end_date: string }
        Returns: {
          booking_date: string
          start_time: string
          end_time: string
          status: string
          payment_status: string
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
      get_users_with_roles: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          email: string
          full_name: string
          user_type: string
          roles: Database["public"]["Enums"]["user_role_type"][]
          created_at: string
        }[]
      }
      grant_role_to_user: {
        Args: {
          target_user_id: string
          role_to_grant: Database["public"]["Enums"]["user_role_type"]
          reason?: string
          expires_at?: string
        }
        Returns: undefined
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      has_role: {
        Args: {
          user_uuid: string
          role_name: Database["public"]["Enums"]["user_role_type"]
        }
        Returns: boolean
      }
      intelligent_field_search: {
        Args: { search_query: string; similarity_threshold?: number }
        Returns: {
          id: string
          name: string
          location: string
          address: string
          city: string
          price_per_hour: number
          rating: number
          total_reviews: number
          images: string[]
          amenities: string[]
          capacity: number
          field_type: string
          relevance_score: number
        }[]
      }
      reject_owner_application: {
        Args: { application_id: string; notes: string }
        Returns: undefined
      }
      revoke_role_from_user: {
        Args: {
          target_user_id: string
          role_to_revoke: Database["public"]["Enums"]["user_role_type"]
          reason?: string
        }
        Returns: undefined
      }
      schedule_owner_payout: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      schedule_review_reminders: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      set_slots_unavailable: {
        Args: {
          p_field_id: string
          p_date: string
          p_start_time: string
          p_end_time: string
          p_reason?: string
          p_notes?: string
        }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      update_owner_stats_for_field: {
        Args: { field_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      user_role_type:
        | "super_admin"
        | "admin_general"
        | "admin_fields"
        | "admin_users"
        | "moderator"
        | "owner"
        | "player"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role_type: [
        "super_admin",
        "admin_general",
        "admin_fields",
        "admin_users",
        "moderator",
        "owner",
        "player",
      ],
    },
  },
} as const
