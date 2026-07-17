export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      events: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          discord_invite: string | null;
          end_at: string;
          faqs: Json | null;
          format: Json;
          id: string;
          image_url: string | null;
          instagram_handle: string | null;
          is_active: boolean | null;
          location: string;
          long_description: string | null;
          organisers: Json | null;
          overview: string | null;
          prizes: Json | null;
          registration_deadline: string;
          registration_link: string | null;
          rules: string | null;
          schedule: Json | null;
          short_blurb: string;
          slug: string;
          sponsors: Json | null;
          start_at: string;
          tags: string[] | null;
          title: string;
          type: Json;
          updated_at: string | null;
          roles: Json | null;
          registration_start: string | null;
          check_in_start: string | null;
          check_in_end: string | null;
          bracket_url: string | null;
          ticketing_enabled: boolean;
          ticket_gates: string[];
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          discord_invite?: string | null;
          end_at: string;
          faqs?: Json | null;
          format: Json;
          id?: string;
          image_url?: string | null;
          instagram_handle?: string | null;
          is_active?: boolean | null;
          location: string;
          long_description?: string | null;
          organisers?: Json | null;
          overview?: string | null;
          prizes?: Json | null;
          registration_deadline: string;
          registration_link?: string | null;
          rules?: string | null;
          schedule?: Json | null;
          short_blurb: string;
          slug: string;
          sponsors?: Json | null;
          start_at: string;
          tags?: string[] | null;
          title: string;
          type: Json;
          updated_at?: string | null;
          roles?: Json | null;
          registration_start?: string | null;
          check_in_start?: string | null;
          check_in_end?: string | null;
          bracket_url?: string | null;
          ticketing_enabled?: boolean;
          ticket_gates?: string[];
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          discord_invite?: string | null;
          end_at?: string;
          faqs?: Json | null;
          format?: Json;
          id?: string;
          image_url?: string | null;
          instagram_handle?: string | null;
          is_active?: boolean | null;
          location?: string;
          long_description?: string | null;
          organisers?: Json | null;
          overview?: string | null;
          prizes?: Json | null;
          registration_deadline?: string;
          registration_link?: string | null;
          rules?: string | null;
          schedule?: Json | null;
          short_blurb?: string;
          slug?: string;
          sponsors?: Json | null;
          start_at?: string;
          tags?: string[] | null;
          title?: string;
          type?: Json;
          updated_at?: string | null;
          roles?: Json | null;
          registration_start?: string | null;
          check_in_start?: string | null;
          check_in_end?: string | null;
          bracket_url?: string | null;
          ticketing_enabled?: boolean;
          ticket_gates?: string[];
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          handle: string | null;
          bio: string | null;
          avatar_url: string | null;
          phone: string | null;
          website: string | null;
          company: string | null;
          job_title: string | null;
          created_at: string;
          updated_at: string;
          date_of_birth: string | null;
          linkedin_url: string | null;
          github_url: string | null;
          twitter_url: string | null;
          instagram_url: string | null;
          portfolio_url: string | null;
          custom_links: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          handle?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          website?: string | null;
          company?: string | null;
          job_title?: string | null;
          created_at?: string;
          updated_at?: string;
          date_of_birth?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          twitter_url?: string | null;
          instagram_url?: string | null;
          portfolio_url?: string | null;
          custom_links?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          handle?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          website?: string | null;
          company?: string | null;
          job_title?: string | null;
          created_at?: string;
          updated_at?: string;
          date_of_birth?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          twitter_url?: string | null;
          instagram_url?: string | null;
          portfolio_url?: string | null;
          custom_links?: Json | null;
        };
        Relationships: [];
      };
      event_registrations: {
        Row: {
          id: string;
          created_at: string | null;
          event_id: string;
          user_id: string | null;
          name: string | null;
          email: string | null;
          phone: string | null;
          message: string | null;
          status: string | null;
          role: string | null;
          team_id: string | null;
          registration_id: string | null;
          qr_code_data: string | null;
          check_in_status: string | null;
          school: string | null;
          year: string | null;
          stream: string | null;
          motivation: string | null;
          github: string | null;
          linkedin: string | null;
          participation_mode: string | null;
          expected_members: number | null;
          edit_count: number | null;
          checked_in_at: string | null;
          checked_in_by: string | null;
          committee: string | null;
          position: string | null;
          country: string | null;
          session_name: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string | null;
          event_id: string;
          user_id?: string | null;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          message?: string | null;
          status?: string | null;
          role?: string | null;
          team_id?: string | null;
          registration_id?: string | null;
          qr_code_data?: string | null;
          check_in_status?: string | null;
          school?: string | null;
          year?: string | null;
          stream?: string | null;
          motivation?: string | null;
          github?: string | null;
          linkedin?: string | null;
          participation_mode?: string | null;
          expected_members?: number | null;
          edit_count?: number | null;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          committee?: string | null;
          position?: string | null;
          country?: string | null;
          session_name?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string | null;
          event_id?: string;
          user_id?: string | null;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          message?: string | null;
          status?: string | null;
          role?: string | null;
          registration_id?: string | null;
          qr_code_data?: string | null;
          check_in_status?: string | null;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          committee?: string | null;
          position?: string | null;
          country?: string | null;
          session_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_event";
            columns: ["event_id"];
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      tickets: {
        Row: {
          id: string;
          event_id: string;
          registration_id: string;
          ticket_code: string;
          qr_token: string;
          status: "VALID" | "USED" | "CANCELLED";
          ticket_type: "participant" | "volunteer" | "judge" | "sponsor" | "media" | "staff";
          gaming_meta: Json | null;
          checked_in_at: string | null;
          checked_in_by: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          cancelled_reason: string | null;
          reissued_from: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          registration_id: string;
          ticket_code?: string;
          qr_token?: string;
          status?: "VALID" | "USED" | "CANCELLED";
          ticket_type?: "participant" | "volunteer" | "judge" | "sponsor" | "media" | "staff";
          gaming_meta?: Json | null;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancelled_reason?: string | null;
          reissued_from?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          registration_id?: string;
          ticket_code?: string;
          qr_token?: string;
          status?: "VALID" | "USED" | "CANCELLED";
          ticket_type?: "participant" | "volunteer" | "judge" | "sponsor" | "media" | "staff";
          gaming_meta?: Json | null;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancelled_reason?: string | null;
          reissued_from?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey";
            columns: ["event_id"];
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_registration_id_fkey";
            columns: ["registration_id"];
            referencedRelation: "event_registrations";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_scans: {
        Row: {
          id: string;
          ticket_id: string | null;
          event_id: string;
          scanned_token: string;
          scanned_by: string | null;
          device_id: string | null;
          gate: string | null;
          result: "VALID" | "DUPLICATE" | "INVALID" | "CANCELLED" | "WRONG_EVENT";
          previous_check_in_at: string | null;
          offline: boolean;
          client_scan_id: string;
          scanned_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id?: string | null;
          event_id: string;
          scanned_token: string;
          scanned_by?: string | null;
          device_id?: string | null;
          gate?: string | null;
          result: "VALID" | "DUPLICATE" | "INVALID" | "CANCELLED" | "WRONG_EVENT";
          previous_check_in_at?: string | null;
          offline?: boolean;
          client_scan_id: string;
          scanned_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string | null;
          event_id?: string;
          scanned_token?: string;
          scanned_by?: string | null;
          device_id?: string | null;
          gate?: string | null;
          result?: "VALID" | "DUPLICATE" | "INVALID" | "CANCELLED" | "WRONG_EVENT";
          previous_check_in_at?: string | null;
          offline?: boolean;
          client_scan_id?: string;
          scanned_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_scans_ticket_id_fkey";
            columns: ["ticket_id"];
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_scans_event_id_fkey";
            columns: ["event_id"];
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_staff: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          role: "organizer" | "volunteer" | "staff";
          granted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          role?: "organizer" | "volunteer" | "staff";
          granted_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          role?: "organizer" | "volunteer" | "staff";
          granted_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_staff_event_id_fkey";
            columns: ["event_id"];
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_schedules: {
        Row: {
          id: string;
          created_at: string | null;
          event_id: string;
          start_at: string | null;
          title: string;
          description: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string | null;
          event_id: string;
          start_at?: string | null;
          title: string;
          description?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string | null;
          event_id?: string;
          start_at?: string | null;
          title?: string;
          description?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_event_schedule";
            columns: ["event_id"];
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_teams: {
        Row: {
          id: string;
          created_at: string | null;
          event_id: string;
          name: string;
          max_members: number | null;
          description: string | null;
          contact_email: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string | null;
          event_id: string;
          name: string;
          max_members?: number | null;
          description?: string | null;
          contact_email?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string | null;
          event_id?: string;
          name?: string;
          description?: string | null;
          contact_email?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_event_team";
            columns: ["event_id"];
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };

      profile_verifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          contact: string;
          token: string;
          expires_at: string;
          verified: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          contact: string;
          token: string;
          expires_at: string;
          verified?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          contact?: string;
          token?: string;
          expires_at?: string;
          verified?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [];
      };

      media_audit_log: {
        Row: {
          id: string;
          user_id: string;
          content_type: string;
          content_id: string;
          media_url: string;
          media_type: string;
          file_size_bytes: number | null;
          uploaded_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          content_type: string;
          content_id: string;
          media_url: string;
          media_type: string;
          file_size_bytes?: number | null;
          uploaded_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          content_type?: string;
          content_id?: string;
          media_url?: string;
          media_type?: string;
          file_size_bytes?: number | null;
          uploaded_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_ticket_for_registration: {
        Args: { p_registration_id: string };
        Returns: Database["public"]["Tables"]["tickets"]["Row"];
      };
      check_in_ticket: {
        Args: {
          p_qr_token: string;
          p_event_id: string;
          p_scanned_by: string;
          p_client_scan_id: string;
          p_device_id?: string | null;
          p_gate?: string | null;
          p_offline?: boolean;
          p_scanned_at?: string;
        };
        Returns: Json;
      };
      cancel_ticket: {
        Args: { p_ticket_id: string; p_cancelled_by: string; p_reason?: string | null };
        Returns: Database["public"]["Tables"]["tickets"]["Row"];
      };
      reissue_ticket: {
        Args: { p_ticket_id: string; p_reissued_by: string };
        Returns: Database["public"]["Tables"]["tickets"]["Row"];
      };
      get_attendance_stats: {
        Args: { p_event_id: string };
        Returns: Json;
      };
    };
    Enums: {
      event_format: "Online" | "Offline" | "Hybrid";
      event_type: "Hackathon" | "Workshop" | "Gaming";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      event_format: ["Online", "Offline", "Hybrid"],
      event_type: ["Hackathon", "Workshop", "Gaming"],
    },
  },
} as const;
