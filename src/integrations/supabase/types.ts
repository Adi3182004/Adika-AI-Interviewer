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
      applications: {
        Row: {
          candidate_id: string
          cover_note: string | null
          created_at: string
          id: string
          job_id: string
          match_score: number | null
          recruiter_notes: string | null
          resume_id: string | null
          skill_gaps: string[] | null
          stage: Database["public"]["Enums"]["application_stage"]
          updated_at: string
        }
        Insert: {
          candidate_id: string
          cover_note?: string | null
          created_at?: string
          id?: string
          job_id: string
          match_score?: number | null
          recruiter_notes?: string | null
          resume_id?: string | null
          skill_gaps?: string[] | null
          stage?: Database["public"]["Enums"]["application_stage"]
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          cover_note?: string | null
          created_at?: string
          id?: string
          job_id?: string
          match_score?: number | null
          recruiter_notes?: string | null
          resume_id?: string | null
          skill_gaps?: string[] | null
          stage?: Database["public"]["Enums"]["application_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          score: number | null
          session_id: string
          signals: Json | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          score?: number | null
          session_id: string
          signals?: Json | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          score?: number | null
          session_id?: string
          signals?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          candidate_id: string
          company: string | null
          created_at: string
          difficulty: string
          experience_level: string | null
          gaps: string[] | null
          id: string
          job_description: string | null
          job_id: string | null
          overall_score: number | null
          question_count: number
          readiness_score: number | null
          role_target: string
          status: Database["public"]["Enums"]["interview_status"]
          strengths: string[] | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          candidate_id: string
          company?: string | null
          created_at?: string
          difficulty?: string
          experience_level?: string | null
          gaps?: string[] | null
          id?: string
          job_description?: string | null
          job_id?: string | null
          overall_score?: number | null
          question_count?: number
          readiness_score?: number | null
          role_target: string
          status?: Database["public"]["Enums"]["interview_status"]
          strengths?: string[] | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          company?: string | null
          created_at?: string
          difficulty?: string
          experience_level?: string | null
          gaps?: string[] | null
          id?: string
          job_description?: string | null
          job_id?: string | null
          overall_score?: number | null
          question_count?: number
          readiness_score?: number | null
          role_target?: string
          status?: Database["public"]["Enums"]["interview_status"]
          strengths?: string[] | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company: string | null
          created_at: string
          description: string | null
          employment_type: string | null
          id: string
          location: string | null
          recruiter_id: string
          salary_max: number | null
          salary_min: number | null
          seniority: string | null
          skills: string[]
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          description?: string | null
          employment_type?: string | null
          id?: string
          location?: string | null
          recruiter_id: string
          salary_max?: number | null
          salary_min?: number | null
          seniority?: string | null
          skills?: string[]
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          description?: string | null
          employment_type?: string | null
          id?: string
          location?: string | null
          recruiter_id?: string
          salary_max?: number | null
          salary_min?: number | null
          seniority?: string | null
          skills?: string[]
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      learning_items: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          resource_url: string | null
          roadmap: Json | null
          skill: string
          source_session_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          resource_url?: string | null
          roadmap?: Json | null
          skill: string
          source_session_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          resource_url?: string | null
          roadmap?: Json | null
          skill?: string
          source_session_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_items_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          company_size: string | null
          created_at: string
          education: string | null
          email: string | null
          experience_level: string | null
          full_name: string | null
          hiring_goals: string | null
          id: string
          industry: string | null
          phone: string | null
          primary_role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string
          education?: string | null
          email?: string | null
          experience_level?: string | null
          full_name?: string | null
          hiring_goals?: string | null
          id: string
          industry?: string | null
          phone?: string | null
          primary_role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string
          education?: string | null
          email?: string | null
          experience_level?: string | null
          full_name?: string | null
          hiring_goals?: string | null
          id?: string
          industry?: string | null
          phone?: string | null
          primary_role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      recruiter_teams: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          ats_feedback: Json | null
          ats_score: number | null
          content: Json
          created_at: string
          file_url: string | null
          id: string
          is_primary: boolean
          parsed_skills: string[]
          role_target: string | null
          targeted_feedback: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ats_feedback?: Json | null
          ats_score?: number | null
          content?: Json
          created_at?: string
          file_url?: string | null
          id?: string
          is_primary?: boolean
          parsed_skills?: string[]
          role_target?: string | null
          targeted_feedback?: Json | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ats_feedback?: Json | null
          ats_score?: number | null
          content?: Json
          created_at?: string
          file_url?: string | null
          id?: string
          is_primary?: boolean
          parsed_skills?: string[]
          role_target?: string | null
          targeted_feedback?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_candidates: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          recruiter_id: string
          tag: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          recruiter_id: string
          tag?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          recruiter_id?: string
          tag?: string | null
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          team_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          team_id: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "recruiter_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "recruiter_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      team_recruiter_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      app_role: "candidate" | "recruiter" | "admin"
      application_stage:
        | "new"
        | "screen"
        | "interview"
        | "offer"
        | "hired"
        | "rejected"
      interview_status: "in_progress" | "completed" | "abandoned"
      job_status: "draft" | "published" | "closed"
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
      app_role: ["candidate", "recruiter", "admin"],
      application_stage: [
        "new",
        "screen",
        "interview",
        "offer",
        "hired",
        "rejected",
      ],
      interview_status: ["in_progress", "completed", "abandoned"],
      job_status: ["draft", "published", "closed"],
    },
  },
} as const
