// Database types in the same shape `supabase gen types typescript` produces.
// If you change supabase/schema.sql you can regenerate this file with:
//   npx supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      seating_tables: {
        Row: {
          id: string
          name: string
          shape: string
          capacity: number
          seat_sides: string
          x: number
          y: number
          width: number
          height: number
          rotation: number
          placed: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          shape?: string
          capacity?: number
          seat_sides?: string
          x?: number
          y?: number
          width?: number
          height?: number
          rotation?: number
          placed?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          shape?: string
          capacity?: number
          seat_sides?: string
          x?: number
          y?: number
          width?: number
          height?: number
          rotation?: number
          placed?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      seating_items: {
        Row: {
          id: string
          kind: string
          label: string
          x: number
          y: number
          width: number
          height: number
          rotation: number
          location: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          kind: string
          label?: string
          x?: number
          y?: number
          width?: number
          height?: number
          rotation?: number
          location?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          kind?: string
          label?: string
          x?: number
          y?: number
          width?: number
          height?: number
          rotation?: number
          location?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      seat_assignments: {
        Row: {
          id: string
          table_id: string
          seat_index: number
          invitation_id: string
          guest_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          table_id: string
          seat_index: number
          invitation_id: string
          guest_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          table_id?: string
          seat_index?: number
          invitation_id?: string
          guest_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      seating_notices: {
        Row: {
          id: string
          person_name: string
          table_name: string
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          person_name: string
          table_name: string
          reason: string
          created_at?: string
        }
        Update: {
          id?: string
          person_name?: string
          table_name?: string
          reason?: string
          created_at?: string
        }
        Relationships: []
      }
      wedding_settings: {
        Row: {
          id: string
          singleton: boolean
          couple_names: string
          wedding_date: string
          hero_title: string | null
          hero_subtitle: string | null
          hero_image_url: string | null
          church_name: string | null
          ceremony_time: string | null
          reception_time: string | null
          church_map_url: string | null
          reception_name: string | null
          reception_map_url: string | null
          story_text: string | null
          closing_message: string | null
          outfit_title: string | null
          outfit_subtitle: string | null
          outfit_section_visible: boolean
          rsvp_deadline: string | null
          rsvp_open: boolean
          rsvp_closed_message: string | null
          rsvp_button_label: string
          rsvp_show_deadline: boolean
          entourage: Json
          entourage_visible: boolean
          entourage_title: string | null
          entourage_subtitle: string | null
          motif_title: string | null
          motif_colors: Json
          gallery_visible: boolean
          gallery_title: string | null
          gallery_subtitle: string | null
          gallery_layout: string
          video_visible: boolean
          video_title: string | null
          video_caption: string | null
          video_url: string | null
          video_poster_url: string | null
          theme: Json
          rsvp_config: Json
          seating_config: Json
          additional_info: Json
          updated_at: string
        }
        Insert: {
          id?: string
          singleton?: boolean
          couple_names?: string
          wedding_date?: string
          hero_title?: string | null
          hero_subtitle?: string | null
          hero_image_url?: string | null
          church_name?: string | null
          ceremony_time?: string | null
          reception_time?: string | null
          church_map_url?: string | null
          reception_name?: string | null
          reception_map_url?: string | null
          story_text?: string | null
          closing_message?: string | null
          outfit_title?: string | null
          outfit_subtitle?: string | null
          outfit_section_visible?: boolean
          rsvp_deadline?: string | null
          rsvp_open?: boolean
          rsvp_closed_message?: string | null
          rsvp_button_label?: string
          rsvp_show_deadline?: boolean
          entourage?: Json
          entourage_visible?: boolean
          entourage_title?: string | null
          entourage_subtitle?: string | null
          motif_title?: string | null
          motif_colors?: Json
          gallery_visible?: boolean
          gallery_title?: string | null
          gallery_subtitle?: string | null
          gallery_layout?: string
          video_visible?: boolean
          video_title?: string | null
          video_caption?: string | null
          video_url?: string | null
          video_poster_url?: string | null
          theme?: Json
          rsvp_config?: Json
          seating_config?: Json
          additional_info?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          singleton?: boolean
          couple_names?: string
          wedding_date?: string
          hero_title?: string | null
          hero_subtitle?: string | null
          hero_image_url?: string | null
          church_name?: string | null
          ceremony_time?: string | null
          reception_time?: string | null
          church_map_url?: string | null
          reception_name?: string | null
          reception_map_url?: string | null
          story_text?: string | null
          closing_message?: string | null
          outfit_title?: string | null
          outfit_subtitle?: string | null
          outfit_section_visible?: boolean
          rsvp_deadline?: string | null
          rsvp_open?: boolean
          rsvp_closed_message?: string | null
          rsvp_button_label?: string
          rsvp_show_deadline?: boolean
          entourage?: Json
          entourage_visible?: boolean
          entourage_title?: string | null
          entourage_subtitle?: string | null
          motif_title?: string | null
          motif_colors?: Json
          gallery_visible?: boolean
          gallery_title?: string | null
          gallery_subtitle?: string | null
          gallery_layout?: string
          video_visible?: boolean
          video_title?: string | null
          video_caption?: string | null
          video_url?: string | null
          video_poster_url?: string | null
          theme?: Json
          rsvp_config?: Json
          seating_config?: Json
          additional_info?: Json
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          id: string
          invitee_name: string
          search_name: string
          invitation_code: string
          printed_at: string | null
          table_number: string | null
          table_id: string | null
          max_additional_guests: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invitee_name: string
          invitation_code?: string
          printed_at?: string | null
          table_number?: string | null
          table_id?: string | null
          max_additional_guests?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invitee_name?: string
          invitation_code?: string
          printed_at?: string | null
          table_number?: string | null
          table_id?: string | null
          max_additional_guests?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      rsvp_responses: {
        Row: {
          id: string
          invitation_id: string
          attendance_status: string
          has_transportation: boolean | null
          needs_transportation: string | null
          vehicle_type: string | null
          coming_from: string | null
          food_preferences: string[]
          has_food_restrictions: boolean | null
          food_restrictions: string | null
          accessibility_needs: string | null
          bringing_additional_guest: boolean
          message_to_couple: string | null
          mobile_number: string | null
          recorded_by_admin: boolean
          custom_answers: Json
          submitted_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invitation_id: string
          attendance_status: string
          has_transportation?: boolean | null
          needs_transportation?: string | null
          vehicle_type?: string | null
          coming_from?: string | null
          food_preferences?: string[]
          has_food_restrictions?: boolean | null
          food_restrictions?: string | null
          accessibility_needs?: string | null
          bringing_additional_guest?: boolean
          message_to_couple?: string | null
          mobile_number?: string | null
          recorded_by_admin?: boolean
          custom_answers?: Json
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invitation_id?: string
          attendance_status?: string
          has_transportation?: boolean | null
          needs_transportation?: string | null
          vehicle_type?: string | null
          coming_from?: string | null
          food_preferences?: string[]
          has_food_restrictions?: boolean | null
          food_restrictions?: string | null
          accessibility_needs?: string | null
          bringing_additional_guest?: boolean
          message_to_couple?: string | null
          mobile_number?: string | null
          recorded_by_admin?: boolean
          custom_answers?: Json
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rsvp_responses_invitation_id_fkey'
            columns: ['invitation_id']
            isOneToOne: true
            referencedRelation: 'invitations'
            referencedColumns: ['id']
          },
        ]
      }
      additional_guests: {
        Row: {
          id: string
          invitation_id: string
          rsvp_response_id: string | null
          guest_name: string
          status: string
          added_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invitation_id: string
          rsvp_response_id?: string | null
          guest_name: string
          status?: string
          added_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invitation_id?: string
          rsvp_response_id?: string | null
          guest_name?: string
          status?: string
          added_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'additional_guests_invitation_id_fkey'
            columns: ['invitation_id']
            isOneToOne: false
            referencedRelation: 'invitations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'additional_guests_rsvp_response_id_fkey'
            columns: ['rsvp_response_id']
            isOneToOne: false
            referencedRelation: 'rsvp_responses'
            referencedColumns: ['id']
          },
        ]
      }
      rsvp_questions: {
        Row: {
          id: string
          question: string
          help_text: string | null
          type: string
          options: Json
          max_selections: number | null
          min_value: number | null
          max_value: number | null
          max_length: number | null
          required: boolean
          audience: string
          show_if: Json | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          question: string
          help_text?: string | null
          type: string
          options?: Json
          max_selections?: number | null
          min_value?: number | null
          max_value?: number | null
          max_length?: number | null
          required?: boolean
          audience?: string
          show_if?: Json | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          question?: string
          help_text?: string | null
          type?: string
          options?: Json
          max_selections?: number | null
          min_value?: number | null
          max_value?: number | null
          max_length?: number | null
          required?: boolean
          audience?: string
          show_if?: Json | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          id: string
          image_url: string
          caption: string | null
          sort_order: number
          is_visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          image_url: string
          caption?: string | null
          sort_order?: number
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          image_url?: string
          caption?: string | null
          sort_order?: number
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      gift_settings: {
        Row: {
          singleton: boolean
          is_visible: boolean
          placement: string
          title: string | null
          message: string | null
          qr_image_url: string | null
          updated_at: string
        }
        Insert: {
          singleton?: boolean
          is_visible?: boolean
          placement?: string
          title?: string | null
          message?: string | null
          qr_image_url?: string | null
          updated_at?: string
        }
        Update: {
          singleton?: boolean
          is_visible?: boolean
          placement?: string
          title?: string | null
          message?: string | null
          qr_image_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      outfit_images: {
        Row: {
          id: string
          gender: string
          image_url: string
          caption: string | null
          sort_order: number
          is_visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          gender: string
          image_url: string
          caption?: string | null
          sort_order?: number
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          gender?: string
          image_url?: string
          caption?: string | null
          sort_order?: number
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_activity_logs: {
        Row: {
          id: string
          admin_user_id: string | null
          action: string
          target_table: string | null
          target_id: string | null
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          admin_user_id?: string | null
          action: string
          target_table?: string | null
          target_id?: string | null
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          admin_user_id?: string | null
          action?: string
          target_table?: string | null
          target_id?: string | null
          details?: Json
          created_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          user_id: string
          email: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          email?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string
          email?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_invitation: {
        Args: { search_name: string }
        Returns: {
          invitation_id: string
          invitee_name: string
          table_number: string | null
          max_additional_guests: number
          has_existing_response: boolean
          included_guests: string[]
        }[]
      }
      find_invitation_by_code: {
        Args: { invite_code: string }
        Returns: {
          invitation_id: string
          invitee_name: string
          table_number: string | null
          max_additional_guests: number
          has_existing_response: boolean
          included_guests: string[]
        }[]
      }
      submit_rsvp: {
        Args: {
          p_invitation_id: string
          p_attendance_status: string
          p_has_transportation?: boolean | null
          p_needs_transportation?: string | null
          p_vehicle_type?: string | null
          p_coming_from?: string | null
          p_food_preferences?: string[]
          p_has_food_restrictions?: boolean | null
          p_food_restrictions?: string | null
          p_accessibility_needs?: string | null
          p_additional_guests?: string[]
          p_message_to_couple?: string | null
          p_mobile_number?: string | null
          p_custom_answers?: Json
        }
        Returns: {
          rsvp_id: string
          attendance_status: string
        }[]
      }
      admin_set_included_guests: {
        Args: { p_invitation_id: string; p_names: string[] }
        Returns: number
      }
      rsvp_is_open: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_public_gift: {
        Args: Record<PropertyKey, never>
        Returns: { title: string | null; message: string | null; qr_image_url: string | null }[]
      }
      admin_record_rsvp: {
        Args: { p_invitation_id: string; p_status: string; p_mobile_number?: string | null }
        Returns: string
      }
      get_invitation_table: {
        Args: { p_invitation_id: string }
        Returns: string | null
      }
      find_my_seat: {
        Args: { search_name: string }
        Returns: Json
      }
      get_invitation_gift: {
        Args: { p_invitation_id: string }
        Returns: { title: string | null; message: string | null; qr_image_url: string | null }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      normalize_name: {
        Args: { p_name: string }
        Returns: string
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

type PublicSchema = Database['public']
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
