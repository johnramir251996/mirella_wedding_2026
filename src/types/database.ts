// Database types in the same shape `supabase gen types typescript` produces.
// If you change supabase/schema.sql you can regenerate this file with:
//   npx supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
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
          church_map_url: string | null
          reception_name: string | null
          reception_map_url: string | null
          story_text: string | null
          closing_message: string | null
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
          church_map_url?: string | null
          reception_name?: string | null
          reception_map_url?: string | null
          story_text?: string | null
          closing_message?: string | null
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
          church_map_url?: string | null
          reception_name?: string | null
          reception_map_url?: string | null
          story_text?: string | null
          closing_message?: string | null
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
          table_number: string | null
          max_additional_guests: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invitee_name: string
          invitation_code?: string
          table_number?: string | null
          max_additional_guests?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invitee_name?: string
          invitation_code?: string
          table_number?: string | null
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
          rsvp_response_id: string
          guest_name: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invitation_id: string
          rsvp_response_id: string
          guest_name: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invitation_id?: string
          rsvp_response_id?: string
          guest_name?: string
          status?: string
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
        }
        Returns: {
          rsvp_id: string
          attendance_status: string
        }[]
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
