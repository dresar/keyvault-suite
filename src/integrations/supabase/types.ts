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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      actors: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      api_key_versions: {
        Row: {
          created_at: string
          id: string
          key_id: string
          revoked_at: string | null
          rotated_at: string | null
          secret_ciphertext: string
          secret_hint: string
          status: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          key_id: string
          revoked_at?: string | null
          rotated_at?: string | null
          secret_ciphertext: string
          secret_hint?: string
          status?: string
          user_id: string
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          key_id?: string
          revoked_at?: string | null
          rotated_at?: string | null
          secret_ciphertext?: string
          secret_hint?: string
          status?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_key_versions_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          actor: string | null
          collection_id: string | null
          created_at: string
          credential_type: string
          deleted_at: string | null
          description: string | null
          environment: string
          expires_at: string | null
          id: string
          last_test_at: string | null
          last_test_status: string | null
          last_used_at: string | null
          metadata: Json
          name: string
          notes: string | null
          provider_id: string
          secret_ciphertext: string
          secret_hint: string
          status: string
          tags: string[]
          updated_at: string
          usage_count: number
          user_id: string
          version: number
        }
        Insert: {
          actor?: string | null
          collection_id?: string | null
          created_at?: string
          credential_type?: string
          deleted_at?: string | null
          description?: string | null
          environment?: string
          expires_at?: string | null
          id?: string
          last_test_at?: string | null
          last_test_status?: string | null
          last_used_at?: string | null
          metadata?: Json
          name: string
          notes?: string | null
          provider_id: string
          secret_ciphertext: string
          secret_hint?: string
          status?: string
          tags?: string[]
          updated_at?: string
          usage_count?: number
          user_id: string
          version?: number
        }
        Update: {
          actor?: string | null
          collection_id?: string | null
          created_at?: string
          credential_type?: string
          deleted_at?: string | null
          description?: string | null
          environment?: string
          expires_at?: string | null
          id?: string
          last_test_at?: string | null
          last_test_status?: string | null
          last_used_at?: string | null
          metadata?: Json
          name?: string
          notes?: string | null
          provider_id?: string
          secret_ciphertext?: string
          secret_hint?: string
          status?: string
          tags?: string[]
          updated_at?: string
          usage_count?: number
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      api_tokens: {
        Row: {
          allowed_collections: string[]
          allowed_environments: string[]
          allowed_providers: string[]
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          last_used_at: string | null
          name: string
          permissions: string[]
          rate_limit_per_hour: number
          revoked_at: string | null
          token_hash: string
          token_prefix: string
          user_id: string
        }
        Insert: {
          allowed_collections?: string[]
          allowed_environments?: string[]
          allowed_providers?: string[]
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          permissions?: string[]
          rate_limit_per_hour?: number
          revoked_at?: string | null
          token_hash: string
          token_prefix: string
          user_id: string
        }
        Update: {
          allowed_collections?: string[]
          allowed_environments?: string[]
          allowed_providers?: string[]
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          permissions?: string[]
          rate_limit_per_hour?: number
          revoked_at?: string | null
          token_hash?: string
          token_prefix?: string
          user_id?: string
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          key_id: string | null
          key_name: string | null
          latency_ms: number | null
          method: string
          provider_slug: string | null
          status_code: number
          strategy: string | null
          token_id: string | null
          token_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          key_id?: string | null
          key_name?: string | null
          latency_ms?: number | null
          method?: string
          provider_slug?: string | null
          status_code?: number
          strategy?: string | null
          token_id?: string | null
          token_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          key_id?: string | null
          key_name?: string | null
          latency_ms?: number | null
          method?: string
          provider_slug?: string | null
          status_code?: number
          strategy?: string | null
          token_id?: string | null
          token_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "api_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      key_pools: {
        Row: {
          created_at: string
          id: string
          provider_id: string
          rr_cursor: number
          skip_unhealthy: boolean
          sticky_ttl_seconds: number
          strategy: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider_id: string
          rr_cursor?: number
          skip_unhealthy?: boolean
          sticky_ttl_seconds?: number
          strategy?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider_id?: string
          rr_cursor?: number
          skip_unhealthy?: boolean
          sticky_ttl_seconds?: number
          strategy?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "key_pools_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          category: string
          created_at: string
          credential_type: string
          description: string | null
          docs_url: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          test_endpoint: string | null
          updated_at: string
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          credential_type?: string
          description?: string | null
          docs_url?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          test_endpoint?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          credential_type?: string
          description?: string | null
          docs_url?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          test_endpoint?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
