export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
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
          {
            foreignKeyName: "availability_period_templates_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields_without_payout"
            referencedColumns: ["field_id"]
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
          paydunya_transfer_id: string | null
          payment_intent_id: string | null
          payment_provider: string | null
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
          paydunya_transfer_id?: string | null
          payment_intent_id?: string | null
          payment_provider?: string | null
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
          paydunya_transfer_id?: string | null
          payment_intent_id?: string | null
          payment_provider?: string | null
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
            foreignKeyName: "bookings_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields_without_payout"
            referencedColumns: ["field_id"]
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
      cagnotte: {
        Row: {
          cancellation_reason: string | null
          collect_window_sec: number
          collected_amount: number
          created_at: string
          created_by_user_id: string
          expires_at: string
          field_id: string
          hold_duration_sec: number
          hold_expires_at: string | null
          hold_started_at: string | null
          hold_threshold_pct: number
          id: string
          preset_mode: string
          refund_completed_at: string | null
          slot_date: string
          slot_end_time: string
          slot_start_time: string
          split_pct_teama: number | null
          split_pct_teamb: number | null
          status: string
          teama_name: string | null
          teama_size: number
          teama_target: number | null
          teamb_name: string | null
          teamb_size: number
          teamb_target: number | null
          total_amount: number
          updated_at: string
          version: number
        }
        Insert: {
          cancellation_reason?: string | null
          collect_window_sec: number
          collected_amount?: number
          created_at?: string
          created_by_user_id: string
          expires_at: string
          field_id: string
          hold_duration_sec: number
          hold_expires_at?: string | null
          hold_started_at?: string | null
          hold_threshold_pct: number
          id?: string
          preset_mode?: string
          refund_completed_at?: string | null
          slot_date: string
          slot_end_time: string
          slot_start_time: string
          split_pct_teama?: number | null
          split_pct_teamb?: number | null
          status: string
          teama_name?: string | null
          teama_size?: number
          teama_target?: number | null
          teamb_name?: string | null
          teamb_size?: number
          teamb_target?: number | null
          total_amount: number
          updated_at?: string
          version?: number
        }
        Update: {
          cancellation_reason?: string | null
          collect_window_sec?: number
          collected_amount?: number
          created_at?: string
          created_by_user_id?: string
          expires_at?: string
          field_id?: string
          hold_duration_sec?: number
          hold_expires_at?: string | null
          hold_started_at?: string | null
          hold_threshold_pct?: number
          id?: string
          preset_mode?: string
          refund_completed_at?: string | null
          slot_date?: string
          slot_end_time?: string
          slot_start_time?: string
          split_pct_teama?: number | null
          split_pct_teamb?: number | null
          status?: string
          teama_name?: string | null
          teama_size?: number
          teama_target?: number | null
          teamb_name?: string | null
          teamb_size?: number
          teamb_target?: number | null
          total_amount?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cagnotte_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cagnotte_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields_without_payout"
            referencedColumns: ["field_id"]
          },
        ]
      }
      cagnotte_contribution: {
        Row: {
          amount: number
          cagnotte_id: string
          created_at: string
          handle_snapshot: string | null
          id: string
          identity_badge: string | null
          instrument_type: string | null
          metadata: Json | null
          method: string | null
          paid_at: string | null
          payer_phone_hash: string | null
          payer_phone_masked: string | null
          proof_code: string | null
          proof_token: string | null
          psp_tx_id: string | null
          refund_attempt_count: number | null
          refund_initiated_at: string | null
          refund_last_attempt_at: string | null
          refund_last_error: string | null
          refund_metadata: Json | null
          refund_reference: string | null
          refund_status: string | null
          refunded_at: string | null
          status: string
          team: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          cagnotte_id: string
          created_at?: string
          handle_snapshot?: string | null
          id?: string
          identity_badge?: string | null
          instrument_type?: string | null
          metadata?: Json | null
          method?: string | null
          paid_at?: string | null
          payer_phone_hash?: string | null
          payer_phone_masked?: string | null
          proof_code?: string | null
          proof_token?: string | null
          psp_tx_id?: string | null
          refund_attempt_count?: number | null
          refund_initiated_at?: string | null
          refund_last_attempt_at?: string | null
          refund_last_error?: string | null
          refund_metadata?: Json | null
          refund_reference?: string | null
          refund_status?: string | null
          refunded_at?: string | null
          status: string
          team?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          cagnotte_id?: string
          created_at?: string
          handle_snapshot?: string | null
          id?: string
          identity_badge?: string | null
          instrument_type?: string | null
          metadata?: Json | null
          method?: string | null
          paid_at?: string | null
          payer_phone_hash?: string | null
          payer_phone_masked?: string | null
          proof_code?: string | null
          proof_token?: string | null
          psp_tx_id?: string | null
          refund_attempt_count?: number | null
          refund_initiated_at?: string | null
          refund_last_attempt_at?: string | null
          refund_last_error?: string | null
          refund_metadata?: Json | null
          refund_reference?: string | null
          refund_status?: string | null
          refunded_at?: string | null
          status?: string
          team?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cagnotte_contribution_cagnotte_id_fkey"
            columns: ["cagnotte_id"]
            isOneToOne: false
            referencedRelation: "cagnotte"
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
          hold_cagnotte_id: string | null
          id: string
          is_available: boolean | null
          is_maintenance: boolean | null
          notes: string | null
          on_hold_until: string | null
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
          hold_cagnotte_id?: string | null
          id?: string
          is_available?: boolean | null
          is_maintenance?: boolean | null
          notes?: string | null
          on_hold_until?: string | null
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
          hold_cagnotte_id?: string | null
          id?: string
          is_available?: boolean | null
          is_maintenance?: boolean | null
          notes?: string | null
          on_hold_until?: string | null
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
          {
            foreignKeyName: "field_availability_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields_without_payout"
            referencedColumns: ["field_id"]
          },
          {
            foreignKeyName: "field_availability_hold_cagnotte_id_fkey"
            columns: ["hold_cagnotte_id"]
            isOneToOne: false
            referencedRelation: "cagnotte"
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
          commission_rate: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          field_type: string
          hold_preset_mode: string
          id: string
          images: string[] | null
          is_active: boolean | null
          latitude: number | null
          location: string
          longitude: number | null
          name: string
          net_price_1h: number | null
          net_price_1h30: number | null
          net_price_2h: number | null
          owner_id: string
          payout_account_id: string | null
          preset_last_changed_at: string | null
          price_1h30: number | null
          price_2h: number | null
          price_per_hour: number
          public_price_1h: number | null
          public_price_1h30: number | null
          public_price_2h: number | null
          rating: number | null
          sport_type: string
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
          commission_rate?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          field_type: string
          hold_preset_mode?: string
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          latitude?: number | null
          location: string
          longitude?: number | null
          name: string
          net_price_1h?: number | null
          net_price_1h30?: number | null
          net_price_2h?: number | null
          owner_id: string
          payout_account_id?: string | null
          preset_last_changed_at?: string | null
          price_1h30?: number | null
          price_2h?: number | null
          price_per_hour: number
          public_price_1h?: number | null
          public_price_1h30?: number | null
          public_price_2h?: number | null
          rating?: number | null
          sport_type?: string
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
          commission_rate?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          field_type?: string
          hold_preset_mode?: string
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string
          net_price_1h?: number | null
          net_price_1h30?: number | null
          net_price_2h?: number | null
          owner_id?: string
          payout_account_id?: string | null
          preset_last_changed_at?: string | null
          price_1h30?: number | null
          price_2h?: number | null
          price_per_hour?: number
          public_price_1h?: number | null
          public_price_1h30?: number | null
          public_price_2h?: number | null
          rating?: number | null
          sport_type?: string
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
            foreignKeyName: "owner_stats_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields_without_payout"
            referencedColumns: ["field_id"]
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
          approved_at: string | null
          approved_by: string | null
          created_at: string
          default_payout_account_id: string | null
          id: string
          mobile_money: string
          phone: string
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          default_payout_account_id?: string | null
          id?: string
          mobile_money?: string
          phone?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          default_payout_account_id?: string | null
          id?: string
          mobile_money?: string
          phone?: string
          rejection_reason?: string | null
          status?: string
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
          created_at: string
          id: string
          is_active: boolean
          label: string
          owner_id: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          owner_id: string
          phone: string
          updated_at?: string
        }
        Update: {
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
            referencedRelation: "fields_without_payout"
            referencedColumns: ["owner_id"]
          },
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
            referencedRelation: "fields_without_payout"
            referencedColumns: ["owner_id"]
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
          created_at: string
          error_message: string | null
          id: string
          owner_id: string
          paydunya_transfer_id: string | null
          payout_attempted_at: string | null
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
          created_at?: string
          error_message?: string | null
          id?: string
          owner_id: string
          paydunya_transfer_id?: string | null
          payout_attempted_at?: string | null
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
          created_at?: string
          error_message?: string | null
          id?: string
          owner_id?: string
          paydunya_transfer_id?: string | null
          payout_attempted_at?: string | null
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
          handle: string | null
          id: string
          phone: string | null
          phone_hash: string | null
          phone_verified: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          handle?: string | null
          id: string
          phone?: string | null
          phone_hash?: string | null
          phone_verified?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          handle?: string | null
          id?: string
          phone?: string | null
          phone_hash?: string | null
          phone_verified?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recurring_slots: {
        Row: {
          created_at: string | null
          created_by: string
          day_of_week: number
          end_date: string | null
          end_time: string
          field_id: string
          id: string
          is_active: boolean | null
          label: string | null
          notes: string | null
          start_date: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          day_of_week: number
          end_date?: string | null
          end_time: string
          field_id: string
          id?: string
          is_active?: boolean | null
          label?: string | null
          notes?: string | null
          start_date: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          day_of_week?: number
          end_date?: string | null
          end_time?: string
          field_id?: string
          id?: string
          is_active?: boolean | null
          label?: string | null
          notes?: string | null
          start_date?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_slots_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_slots_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields_without_payout"
            referencedColumns: ["field_id"]
          },
        ]
      }
      refund_logs: {
        Row: {
          amount: number
          attempt_number: number | null
          cagnotte_id: string
          contribution_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          paydunya_status: string | null
          phone_number: string
          provider: string
          refund_reference: string | null
          refund_status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          attempt_number?: number | null
          cagnotte_id: string
          contribution_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          paydunya_status?: string | null
          phone_number: string
          provider: string
          refund_reference?: string | null
          refund_status: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          attempt_number?: number | null
          cagnotte_id?: string
          contribution_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          paydunya_status?: string | null
          phone_number?: string
          provider?: string
          refund_reference?: string | null
          refund_status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_logs_cagnotte_id_fkey"
            columns: ["cagnotte_id"]
            isOneToOne: false
            referencedRelation: "cagnotte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_logs_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "cagnotte_contribution"
            referencedColumns: ["id"]
          },
        ]
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
          reviewer_name: string | null
          user_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string | null
          field_id: string
          id?: string
          rating: number
          reviewer_name?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string | null
          field_id?: string
          id?: string
          rating?: number
          reviewer_name?: string | null
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
            foreignKeyName: "reviews_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields_without_payout"
            referencedColumns: ["field_id"]
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
          {
            foreignKeyName: "user_favorites_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields_without_payout"
            referencedColumns: ["field_id"]
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
      fields_without_payout: {
        Row: {
          field_id: string | null
          field_name: string | null
          owner_id: string | null
          owner_mobile_money: string | null
          owner_phone: string | null
          owner_user_id: string | null
          payout_accounts_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fields_owner_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fields_owner"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["user_id"]
          },
        ]
      }
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
      award_reviewer_badge: { Args: { p_user_id: string }; Returns: undefined }
      batch_cleanup_expired_holds: { Args: never; Returns: number }
      calculate_cagnotte_timers: {
        Args: { slot_datetime: string }
        Returns: Json
      }
      calculate_search_similarity: {
        Args: { field_text: string; search_term: string }
        Returns: number
      }
      can_promote_user: {
        Args: {
          promoter_id: string
          target_role: Database["public"]["Enums"]["user_role_type"]
        }
        Returns: boolean
      }
      cancel_conflicting_cagnottes_in_progress: {
        Args: {
          p_date: string
          p_end_time: string
          p_field_id: string
          p_start_time: string
        }
        Returns: number
      }
      change_user_type: {
        Args: {
          new_role?: Database["public"]["Enums"]["user_role_type"]
          new_user_type: string
          reason?: string
          target_user_id: string
        }
        Returns: undefined
      }
      check_booking_conflict: {
        Args: {
          p_booking_date: string
          p_booking_id?: string
          p_end_time: string
          p_field_id: string
          p_start_time: string
        }
        Returns: boolean
      }
      check_recurring_slot_conflict: {
        Args: {
          p_date: string
          p_end_time: string
          p_field_id: string
          p_start_time: string
        }
        Returns: boolean
      }
      check_slot_booking_status: {
        Args: {
          p_date: string
          p_end_time: string
          p_field_id: string
          p_start_time: string
        }
        Returns: boolean
      }
      cleanup_expired_bookings: { Args: never; Returns: undefined }
      cleanup_expired_cagnottes: { Args: never; Returns: undefined }
      confirm_cagnotte_and_lock_slot: {
        Args: { p_cagnotte_id: string }
        Returns: Json
      }
      contribute_to_cagnotte:
        | {
            Args: {
              p_amount: number
              p_cagnotte_id: string
              p_method?: string
              p_psp_tx_id?: string
              p_team?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_cagnotte_id: string
              p_metadata?: Json
              p_method?: string
              p_psp_tx_id?: string
              p_team?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_cagnotte_id: string
              p_metadata?: Json
              p_method?: string
              p_psp_tx_id?: string
              p_team?: string
              p_user_id?: string
            }
            Returns: Json
          }
      create_availability_for_period: {
        Args: {
          p_end_date: string
          p_end_time: string
          p_exclude_days?: number[]
          p_field_id: string
          p_slot_duration?: number
          p_start_date: string
          p_start_time: string
          p_template_id?: string
        }
        Returns: number
      }
      create_availability_for_period_with_day_specific_times: {
        Args: {
          p_end_date: string
          p_field_id: string
          p_slot_duration: number
          p_slots_to_create: Json
          p_start_date: string
        }
        Returns: number
      }
      create_cagnotte:
        | {
            Args: {
              p_field_id: string
              p_slot_date: string
              p_slot_end_time: string
              p_slot_start_time: string
              p_split_teama?: number
              p_split_teamb?: number
              p_total_amount: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_field_id: string
              p_slot_date: string
              p_slot_end_time: string
              p_slot_start_time: string
              p_teama_name?: string
              p_teama_size?: number
              p_teamb_name?: string
              p_teamb_size?: number
              p_total_amount: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_field_id: string
              p_slot_date: string
              p_slot_end_time: string
              p_slot_start_time: string
              p_teama_size?: number
              p_teamb_size?: number
              p_total_amount: number
            }
            Returns: Json
          }
      deactivate_field: {
        Args: { field_id: string; reason?: string }
        Returns: undefined
      }
      generate_proof_code: { Args: never; Returns: string }
      generate_proof_token: { Args: never; Returns: string }
      generate_unique_confirmation_code: { Args: never; Returns: string }
      get_all_owner_applications: {
        Args: never
        Returns: {
          admin_notes: string
          created_at: string
          experience: string
          full_name: string
          id: string
          motivation: string
          phone: string
          reviewed_at: string
          reviewed_by: string
          status: string
          updated_at: string
          user_email: string
          user_id: string
        }[]
      }
      get_cagnotte_team_info: {
        Args: { p_cagnotte_id: string; p_team: string }
        Returns: Json
      }
      get_field_bookings: {
        Args: { p_end_date: string; p_field_id: string; p_start_date: string }
        Returns: {
          booking_date: string
          end_time: string
          payment_status: string
          start_time: string
          status: string
        }[]
      }
      get_owner_recent_bookings: {
        Args: { owner_uuid: string }
        Returns: {
          booking_date: string
          booking_id: string
          end_time: string
          field_name: string
          player_count: number
          start_time: string
          status: string
          total_price: number
          user_name: string
        }[]
      }
      get_user_owner_application: {
        Args: { p_user_id: string }
        Returns: {
          admin_notes: string
          created_at: string
          experience: string
          full_name: string
          id: string
          motivation: string
          phone: string
          reviewed_at: string
          reviewed_by: string
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          roles: Database["public"]["Enums"]["user_role_type"][]
          user_id: string
          user_type: string
        }[]
      }
      grant_role_to_user: {
        Args: {
          expires_at?: string
          reason?: string
          role_to_grant: Database["public"]["Enums"]["user_role_type"]
          target_user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          role_name: Database["public"]["Enums"]["user_role_type"]
          user_uuid: string
        }
        Returns: boolean
      }
      intelligent_field_search: {
        Args: { search_query: string; similarity_threshold?: number }
        Returns: {
          address: string
          amenities: string[]
          capacity: number
          city: string
          field_type: string
          id: string
          images: string[]
          location: string
          name: string
          price_per_hour: number
          rating: number
          relevance_score: number
          total_reviews: number
        }[]
      }
      reject_owner_application: {
        Args: { application_id: string; notes: string }
        Returns: undefined
      }
      resync_all_recurring_slots: {
        Args: { p_field_id?: string }
        Returns: number
      }
      revoke_role_from_user: {
        Args: {
          reason?: string
          role_to_revoke: Database["public"]["Enums"]["user_role_type"]
          target_user_id: string
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
      set_slots_unavailable: {
        Args: {
          p_date: string
          p_end_time: string
          p_field_id: string
          p_notes?: string
          p_reason?: string
          p_start_time: string
        }
        Returns: number
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      test_role_system: { Args: never; Returns: boolean }
      update_cagnotte_refund_status: {
        Args: { p_cagnotte_id: string }
        Returns: undefined
      }
      update_contribution_metadata_for_refund: {
        Args: { p_contribution_ids: string[]; p_phone_e164: string }
        Returns: number
      }
      update_owner_stats_for_field: {
        Args: { field_uuid: string }
        Returns: undefined
      }
      validate_booking_slot_exists:
        | {
            Args: { p_date: string; p_field_id: string; p_start_time: string }
            Returns: boolean
          }
        | {
            Args: {
              p_date: string
              p_end_time: string
              p_field_id: string
              p_start_time: string
            }
            Returns: boolean
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
        | "admin"
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
        "admin",
      ],
    },
  },
} as const
