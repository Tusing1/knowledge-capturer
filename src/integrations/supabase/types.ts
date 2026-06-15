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
      chunks: {
        Row: {
          created_at: string
          duration_ms: number
          error: string | null
          id: string
          index: number
          lecture_id: string
          mime_type: string
          partial_notes: Json | null
          status: string
          storage_path: string
          transcript: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          error?: string | null
          id?: string
          index: number
          lecture_id: string
          mime_type?: string
          partial_notes?: Json | null
          status?: string
          storage_path: string
          transcript?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number
          error?: string | null
          id?: string
          index?: number
          lecture_id?: string
          mime_type?: string
          partial_notes?: Json | null
          status?: string
          storage_path?: string
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chunks_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      course_syllabi: {
        Row: {
          course: string
          created_at: string
          id: string
          syllabus: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course: string
          created_at?: string
          id?: string
          syllabus: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course?: string
          created_at?: string
          id?: string
          syllabus?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course: string
          created_at: string
          id: string
          professor_id: string
          student_id: string
        }
        Insert: {
          course: string
          created_at?: string
          id?: string
          professor_id: string
          student_id: string
        }
        Update: {
          course?: string
          created_at?: string
          id?: string
          professor_id?: string
          student_id?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          course: string | null
          created_at: string
          exam_date: string
          id: string
          lecture_ids: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course?: string | null
          created_at?: string
          exam_date: string
          id?: string
          lecture_ids?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course?: string | null
          created_at?: string
          exam_date?: string
          id?: string
          lecture_ids?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcard_reviews: {
        Row: {
          back: string
          card_index: number
          created_at: string
          due_at: string
          ease_factor: number
          front: string
          id: string
          interval_days: number
          last_reviewed_at: string | null
          lecture_id: string
          repetitions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          back: string
          card_index: number
          created_at?: string
          due_at?: string
          ease_factor?: number
          front: string
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          lecture_id: string
          repetitions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          back?: string
          card_index?: number
          created_at?: string
          due_at?: string
          ease_factor?: number
          front?: string
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          lecture_id?: string
          repetitions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_outputs: {
        Row: {
          citations: Json | null
          concept_map: Json | null
          flashcards: Json | null
          full_transcript: string | null
          gap_analysis: Json | null
          generated_at: string
          lecture_id: string
          likely_questions: Json | null
          quotes: Json | null
          structured_notes: Json | null
          summary: string | null
          user_id: string
          whiteboard_captures: Json | null
        }
        Insert: {
          citations?: Json | null
          concept_map?: Json | null
          flashcards?: Json | null
          full_transcript?: string | null
          gap_analysis?: Json | null
          generated_at?: string
          lecture_id: string
          likely_questions?: Json | null
          quotes?: Json | null
          structured_notes?: Json | null
          summary?: string | null
          user_id: string
          whiteboard_captures?: Json | null
        }
        Update: {
          citations?: Json | null
          concept_map?: Json | null
          flashcards?: Json | null
          full_transcript?: string | null
          gap_analysis?: Json | null
          generated_at?: string
          lecture_id?: string
          likely_questions?: Json | null
          quotes?: Json | null
          structured_notes?: Json | null
          summary?: string | null
          user_id?: string
          whiteboard_captures?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lecture_outputs_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: true
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lectures: {
        Row: {
          course: string | null
          created_at: string
          ended_at: string | null
          id: string
          is_favorite: boolean
          language: string
          output_language: string
          share_id: string | null
          slides_storage_path: string | null
          slides_text: string | null
          started_at: string
          status: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          is_favorite?: boolean
          language?: string
          output_language?: string
          share_id?: string | null
          slides_storage_path?: string | null
          slides_text?: string | null
          started_at?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          is_favorite?: boolean
          language?: string
          output_language?: string
          share_id?: string | null
          slides_storage_path?: string | null
          slides_text?: string | null
          started_at?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_demo: boolean
          is_pro: boolean
          pro_expires_at: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          is_demo?: boolean
          is_pro?: boolean
          pro_expires_at?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_demo?: boolean
          is_pro?: boolean
          pro_expires_at?: string | null
        }
        Relationships: []
      }
      shared_note_votes: {
        Row: {
          created_at: string
          note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          note_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_note_votes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "shared_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_notes: {
        Row: {
          content: string
          course: string
          created_at: string
          id: string
          kind: string
          lecture_id: string | null
          user_id: string
          votes: number
        }
        Insert: {
          content: string
          course: string
          created_at?: string
          id?: string
          kind?: string
          lecture_id?: string | null
          user_id: string
          votes?: number
        }
        Update: {
          content?: string
          course?: string
          created_at?: string
          id?: string
          kind?: string
          lecture_id?: string | null
          user_id?: string
          votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "shared_notes_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "professor" | "student"
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
      app_role: ["admin", "professor", "student"],
    },
  },
} as const
