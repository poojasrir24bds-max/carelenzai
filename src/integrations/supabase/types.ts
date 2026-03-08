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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      allowed_admins: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      consultations: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          notes: string | null
          patient_id: string
          scan_id: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          notes?: string | null
          patient_id: string
          scan_id?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          scan_id?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      dental_scans: {
        Row: {
          clinical_notes: string[] | null
          conditions_found: string[] | null
          confidence: number | null
          created_at: string
          id: string
          image_url: string | null
          overall_assessment: string | null
          recommendations: string[] | null
          scan_type: string
          severity: string | null
          teeth_identified: Json | null
          user_id: string
        }
        Insert: {
          clinical_notes?: string[] | null
          conditions_found?: string[] | null
          confidence?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          overall_assessment?: string | null
          recommendations?: string[] | null
          scan_type?: string
          severity?: string | null
          teeth_identified?: Json | null
          user_id: string
        }
        Update: {
          clinical_notes?: string[] | null
          conditions_found?: string[] | null
          confidence?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          overall_assessment?: string | null
          recommendations?: string[] | null
          scan_type?: string
          severity?: string | null
          teeth_identified?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      doctor_profiles: {
        Row: {
          created_at: string
          doctor_id: string
          hospital_name: string
          id: string
          is_active: boolean
          is_verified: boolean
          medical_license: string
          specialization: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          hospital_name: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          medical_license: string
          specialization: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          hospital_name?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          medical_license?: string
          specialization?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_doubts: {
        Row: {
          ai_answer: string | null
          answer: string | null
          created_at: string
          doctor_id: string | null
          id: string
          patient_id: string
          question: string
          scan_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_answer?: string | null
          answer?: string | null
          created_at?: string
          doctor_id?: string | null
          id?: string
          patient_id: string
          question: string
          scan_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_answer?: string | null
          answer?: string | null
          created_at?: string
          doctor_id?: string | null
          id?: string
          patient_id?: string
          question?: string
          scan_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_doubts_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          created_at: string
          email: string
          full_name: string
          id: string
          sex: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          sex?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          sex?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scans: {
        Row: {
          area: string
          causes: string[] | null
          condition: string | null
          confidence: number | null
          created_at: string
          definition: string | null
          guidance: Json | null
          id: string
          image_url: string | null
          severity: string | null
          user_id: string
        }
        Insert: {
          area: string
          causes?: string[] | null
          condition?: string | null
          confidence?: number | null
          created_at?: string
          definition?: string | null
          guidance?: Json | null
          id?: string
          image_url?: string | null
          severity?: string | null
          user_id: string
        }
        Update: {
          area?: string
          causes?: string[] | null
          condition?: string | null
          confidence?: number | null
          created_at?: string
          definition?: string | null
          guidance?: Json | null
          id?: string
          image_url?: string | null
          severity?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_count: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_email_allowed: { Args: { _email: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "patient" | "doctor"
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
      app_role: ["admin", "moderator", "patient", "doctor"],
    },
  },
} as const
