export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          updated_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name: string;
          id?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      attention_items: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          needs_decision: boolean;
          ref_id: string | null;
          resolved_at: string | null;
          seen_at: string | null;
          type: Database["public"]["Enums"]["attention_type"];
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          needs_decision?: boolean;
          ref_id?: string | null;
          resolved_at?: string | null;
          seen_at?: string | null;
          type: Database["public"]["Enums"]["attention_type"];
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          needs_decision?: boolean;
          ref_id?: string | null;
          resolved_at?: string | null;
          seen_at?: string | null;
          type?: Database["public"]["Enums"]["attention_type"];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "attention_items_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_requests: {
        Row: {
          admin_reason: string | null;
          created_at: string;
          decided_at: string | null;
          event_id: string;
          host_reason: string;
          id: string;
          status: Database["public"]["Enums"]["contact_request_status"];
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          admin_reason?: string | null;
          created_at?: string;
          decided_at?: string | null;
          event_id: string;
          host_reason: string;
          id?: string;
          status?: Database["public"]["Enums"]["contact_request_status"];
          updated_at?: string | null;
        };
        Update: {
          admin_reason?: string | null;
          created_at?: string;
          decided_at?: string | null;
          event_id?: string;
          host_reason?: string;
          id?: string;
          status?: Database["public"]["Enums"]["contact_request_status"];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contact_requests_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      email_log: {
        Row: {
          body: string;
          created_at: string;
          error: string | null;
          id: string;
          provider: Database["public"]["Enums"]["email_provider"];
          sent_at: string | null;
          subject: string;
          template: string;
          to_email: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          provider: Database["public"]["Enums"]["email_provider"];
          sent_at?: string | null;
          subject: string;
          template: string;
          to_email: string;
          updated_at?: string | null;
        };
        Update: {
          body?: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          provider?: Database["public"]["Enums"]["email_provider"];
          sent_at?: string | null;
          subject?: string;
          template?: string;
          to_email?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      event_activity: {
        Row: {
          action: string;
          actor: Database["public"]["Enums"]["activity_actor"];
          created_at: string;
          event_id: string | null;
          id: string;
          note: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor: Database["public"]["Enums"]["activity_actor"];
          created_at?: string;
          event_id?: string | null;
          id?: string;
          note?: string | null;
          updated_at?: string | null;
        };
        Update: {
          action?: string;
          actor?: Database["public"]["Enums"]["activity_actor"];
          created_at?: string;
          event_id?: string | null;
          id?: string;
          note?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "event_activity_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_edits: {
        Row: {
          changes: NonNullable<Json>;
          created_at: string;
          event_id: string;
          id: string;
          seen_at: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          changes: NonNullable<Json>;
          created_at?: string;
          event_id: string;
          id?: string;
          seen_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          changes?: NonNullable<Json>;
          created_at?: string;
          event_id?: string;
          id?: string;
          seen_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "event_edits_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_private_details: {
        Row: {
          about_group: string;
          created_at: string;
          emergency_contact_name: string;
          emergency_contact_phone: string;
          event_id: string;
          exact_address: string;
          host_email: string;
          host_name: string;
          host_phone: string;
          id: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          about_group: string;
          created_at?: string;
          emergency_contact_name: string;
          emergency_contact_phone: string;
          event_id: string;
          exact_address: string;
          host_email: string;
          host_name: string;
          host_phone: string;
          id?: string;
          updated_at?: string | null;
        };
        Update: {
          about_group?: string;
          created_at?: string;
          emergency_contact_name?: string;
          emergency_contact_phone?: string;
          event_id?: string;
          exact_address?: string;
          host_email?: string;
          host_name?: string;
          host_phone?: string;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "event_private_details_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: true;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          approved_at: string | null;
          capacity: number | null;
          county: string;
          created_at: string;
          description: string;
          end_at: string;
          host_edit_token_hash: string | null;
          id: string;
          opened_by_admin_at: string | null;
          poster_path: string | null;
          start_at: string;
          status: Database["public"]["Enums"]["event_status"];
          status_reason: string | null;
          submitted_at: string;
          title: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          approved_at?: string | null;
          capacity?: number | null;
          county: string;
          created_at?: string;
          description: string;
          end_at: string;
          host_edit_token_hash?: string | null;
          id?: string;
          opened_by_admin_at?: string | null;
          poster_path?: string | null;
          start_at: string;
          status?: Database["public"]["Enums"]["event_status"];
          status_reason?: string | null;
          submitted_at?: string;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          approved_at?: string | null;
          capacity?: number | null;
          county?: string;
          created_at?: string;
          description?: string;
          end_at?: string;
          host_edit_token_hash?: string | null;
          id?: string;
          opened_by_admin_at?: string | null;
          poster_path?: string | null;
          start_at?: string;
          status?: Database["public"]["Enums"]["event_status"];
          status_reason?: string | null;
          submitted_at?: string;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      gallery_images: {
        Row: {
          caption: string | null;
          created_at: string;
          id: string;
          image_path: string;
          sort_order: number;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          caption?: string | null;
          created_at?: string;
          id?: string;
          image_path: string;
          sort_order?: number;
          updated_at?: string | null;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          id?: string;
          image_path?: string;
          sort_order?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      podcasts: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          published: boolean;
          published_at: string | null;
          title: string;
          updated_at: string | null;
          youtube_url: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string;
          id?: string;
          published?: boolean;
          published_at?: string | null;
          title: string;
          updated_at?: string | null;
          youtube_url: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          published?: boolean;
          published_at?: string | null;
          title?: string;
          updated_at?: string | null;
          youtube_url?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: { created_at: string; id: number; key: string };
        Insert: { created_at?: string; id?: never; key: string };
        Update: { created_at?: string; id?: never; key?: string };
        Relationships: [];
      };
      registrations: {
        Row: {
          consented_at: string;
          created_at: string;
          email: string;
          event_id: string;
          id: string;
          name: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          consented_at: string;
          created_at?: string;
          email: string;
          event_id: string;
          id?: string;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          consented_at?: string;
          created_at?: string;
          email?: string;
          event_id?: string;
          id?: string;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      site_sections: {
        Row: {
          body: string;
          created_at: string;
          heading: string;
          id: string;
          image_path: string | null;
          key: string;
          page: string;
          sort_order: number;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          body?: string;
          created_at?: string;
          heading?: string;
          id?: string;
          image_path?: string | null;
          key: string;
          page: string;
          sort_order?: number;
          updated_at?: string | null;
        };
        Update: {
          body?: string;
          created_at?: string;
          heading?: string;
          id?: string;
          image_path?: string | null;
          key?: string;
          page?: string;
          sort_order?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      stories: {
        Row: {
          body: string;
          cover_path: string | null;
          created_at: string;
          id: string;
          published: boolean;
          published_at: string | null;
          slug: string;
          title: string;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          body?: string;
          cover_path?: string | null;
          created_at?: string;
          id?: string;
          published?: boolean;
          published_at?: string | null;
          slug: string;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          body?: string;
          cover_path?: string | null;
          created_at?: string;
          id?: string;
          published?: boolean;
          published_at?: string | null;
          slug?: string;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      event_places_left: { Args: { event_ids: string[] }; Returns: { event_id: string; places_left: number }[] };
      hit_rate_limit: { Args: { p_key: string; p_limit: number; p_window: string }; Returns: boolean };
      host_cancel_event: { Args: { p_event_id: string; p_token_hash: string }; Returns: string | null };
      host_edit_event: {
        Args: { p_event_id: string; p_token_hash: string; p_event: Json; p_details: Json; p_changes: Json };
        Returns: string | null;
      };
      host_request_contact: { Args: { p_event_id: string; p_token_hash: string; p_reason: string }; Returns: string | null };
      host_resubmit_event: { Args: { p_event_id: string; p_token_hash: string; p_event: Json; p_details: Json }; Returns: boolean };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      submit_event: {
        Args: {
          p_title: string;
          p_county: string;
          p_start_at: string;
          p_end_at: string;
          p_description: string;
          p_poster_path: string | null;
          p_capacity: number | null;
          p_exact_address: string;
          p_host_name: string;
          p_host_email: string;
          p_host_phone: string;
          p_about_group: string;
          p_emergency_contact_name: string;
          p_emergency_contact_phone: string;
        };
        Returns: string;
      };
      register_for_event: { Args: { p_event_id: string; p_name: string; p_email: string }; Returns: string };
      run_retention: { Args: Record<PropertyKey, never>; Returns: Json };
    };
    Enums: {
      activity_actor: "admin" | "host" | "system";
      attention_type: "host_edited" | "host_cancelled" | "contact_request";
      contact_request_status: "requested" | "shared" | "declined";
      email_provider: "console" | "resend";
      event_status: "pending" | "needs_changes" | "declined" | "live" | "cancelled" | "taken_down";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_actor: ["admin", "host", "system"],
      attention_type: ["host_edited", "host_cancelled", "contact_request"],
      contact_request_status: ["requested", "shared", "declined"],
      email_provider: ["console", "resend"],
      event_status: ["pending", "needs_changes", "declined", "live", "cancelled", "taken_down"],
    },
  },
} as const;
