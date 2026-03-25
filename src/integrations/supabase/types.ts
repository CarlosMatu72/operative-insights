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
      branches: {
        Row: {
          activo: boolean
          clave: string
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          clave: string
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          clave?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      classification_feature_rules: {
        Row: {
          classification_feature_id: string
          cliente_id: string | null
          customs_key_id: string | null
          default_value: boolean
          id: string
          sucursal_id: string | null
        }
        Insert: {
          classification_feature_id: string
          cliente_id?: string | null
          customs_key_id?: string | null
          default_value?: boolean
          id?: string
          sucursal_id?: string | null
        }
        Update: {
          classification_feature_id?: string
          cliente_id?: string | null
          customs_key_id?: string | null
          default_value?: boolean
          id?: string
          sucursal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classification_feature_rules_classification_feature_id_fkey"
            columns: ["classification_feature_id"]
            isOneToOne: false
            referencedRelation: "classification_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_feature_rules_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_feature_rules_customs_key_id_fkey"
            columns: ["customs_key_id"]
            isOneToOne: false
            referencedRelation: "customs_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classification_feature_rules_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      classification_features: {
        Row: {
          activo: boolean
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          descripcion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          activo: boolean
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      customs_keys: {
        Row: {
          activo: boolean
          clave: string
          descripcion: string | null
          id: string
        }
        Insert: {
          activo?: boolean
          clave: string
          descripcion?: string | null
          id?: string
        }
        Update: {
          activo?: boolean
          clave?: string
          descripcion?: string | null
          id?: string
        }
        Relationships: []
      }
      document_types: {
        Row: {
          code: string
          id: string
          name: string
        }
        Insert: {
          code: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      executives: {
        Row: {
          activo: boolean
          id: string
          nombre: string
          sucursal_id: string | null
        }
        Insert: {
          activo?: boolean
          id?: string
          nombre: string
          sucursal_id?: string | null
        }
        Update: {
          activo?: boolean
          id?: string
          nombre?: string
          sucursal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executives_sucursal_id_fkey"
            columns: ["sucursal_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      finding_histories: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string | null
          finding_id: string
          id: string
          new_status: string
          previous_status: string | null
          review_round_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          finding_id: string
          id?: string
          new_status: string
          previous_status?: string | null
          review_round_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          finding_id?: string
          id?: string
          new_status?: string
          previous_status?: string | null
          review_round_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finding_histories_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "review_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finding_histories_review_round_id_fkey"
            columns: ["review_round_id"]
            isOneToOne: false
            referencedRelation: "review_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      item_ranges: {
        Row: {
          activo: boolean
          id: string
          max_partidas: number
          min_partidas: number
          nombre_rango: string
        }
        Insert: {
          activo?: boolean
          id?: string
          max_partidas: number
          min_partidas: number
          nombre_rango: string
        }
        Update: {
          activo?: boolean
          id?: string
          max_partidas?: number
          min_partidas?: number
          nombre_rango?: string
        }
        Relationships: []
      }
      observation_categories: {
        Row: {
          activo: boolean
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          activo?: boolean
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          activo?: boolean
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      observation_errors: {
        Row: {
          activo: boolean
          category_id: string
          codigo_error: string | null
          descripcion: string
          descuento_puntos: number | null
          id: string
          severidad: string | null
          subcategory_id: string
        }
        Insert: {
          activo?: boolean
          category_id: string
          codigo_error?: string | null
          descripcion: string
          descuento_puntos?: number | null
          id?: string
          severidad?: string | null
          subcategory_id: string
        }
        Update: {
          activo?: boolean
          category_id?: string
          codigo_error?: string | null
          descripcion?: string
          descuento_puntos?: number | null
          id?: string
          severidad?: string | null
          subcategory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "observation_errors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "observation_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observation_errors_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "observation_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      observation_subcategories: {
        Row: {
          activo: boolean
          category_id: string
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          activo?: boolean
          category_id: string
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          activo?: boolean
          category_id?: string
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "observation_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "observation_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean
          avatar_url: string | null
          correo: string
          created_at: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          avatar_url?: string | null
          correo: string
          created_at?: string
          id: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          avatar_url?: string | null
          correo?: string
          created_at?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      rejection_histories: {
        Row: {
          comentario: string | null
          id: string
          motivo: string
          rejected_at: string
          rejected_by: string | null
          reopened_at: string | null
          reopened_by: string | null
          review_case_id: string
          review_round_id: string | null
        }
        Insert: {
          comentario?: string | null
          id?: string
          motivo: string
          rejected_at?: string
          rejected_by?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          review_case_id: string
          review_round_id?: string | null
        }
        Update: {
          comentario?: string | null
          id?: string
          motivo?: string
          rejected_at?: string
          rejected_by?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          review_case_id?: string
          review_round_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rejection_histories_review_case_id_fkey"
            columns: ["review_case_id"]
            isOneToOne: false
            referencedRelation: "review_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rejection_histories_review_round_id_fkey"
            columns: ["review_round_id"]
            isOneToOne: false
            referencedRelation: "review_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      review_case_classifications: {
        Row: {
          classification_feature_id: string
          id: string
          review_case_id: string
          value_boolean: boolean
        }
        Insert: {
          classification_feature_id: string
          id?: string
          review_case_id: string
          value_boolean?: boolean
        }
        Update: {
          classification_feature_id?: string
          id?: string
          review_case_id?: string
          value_boolean?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "review_case_classifications_classification_feature_id_fkey"
            columns: ["classification_feature_id"]
            isOneToOne: false
            referencedRelation: "classification_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_case_classifications_review_case_id_fkey"
            columns: ["review_case_id"]
            isOneToOne: false
            referencedRelation: "review_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      review_case_details: {
        Row: {
          branch_id: string | null
          client_id: string | null
          comments_generales: string | null
          customs_key_id: string | null
          executive_id: string | null
          id: string
          item_range_id: string | null
          partidas: number | null
          review_case_id: string
        }
        Insert: {
          branch_id?: string | null
          client_id?: string | null
          comments_generales?: string | null
          customs_key_id?: string | null
          executive_id?: string | null
          id?: string
          item_range_id?: string | null
          partidas?: number | null
          review_case_id: string
        }
        Update: {
          branch_id?: string | null
          client_id?: string | null
          comments_generales?: string | null
          customs_key_id?: string | null
          executive_id?: string | null
          id?: string
          item_range_id?: string | null
          partidas?: number | null
          review_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_case_details_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_case_details_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_case_details_customs_key_id_fkey"
            columns: ["customs_key_id"]
            isOneToOne: false
            referencedRelation: "customs_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_case_details_executive_id_fkey"
            columns: ["executive_id"]
            isOneToOne: false
            referencedRelation: "executives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_case_details_item_range_id_fkey"
            columns: ["item_range_id"]
            isOneToOne: false
            referencedRelation: "item_ranges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_case_details_review_case_id_fkey"
            columns: ["review_case_id"]
            isOneToOne: false
            referencedRelation: "review_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      review_case_documentation: {
        Row: {
          documentation_comment: string | null
          documentation_status: string | null
          id: string
          review_case_id: string
        }
        Insert: {
          documentation_comment?: string | null
          documentation_status?: string | null
          id?: string
          review_case_id: string
        }
        Update: {
          documentation_comment?: string | null
          documentation_status?: string | null
          id?: string
          review_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_case_documentation_review_case_id_fkey"
            columns: ["review_case_id"]
            isOneToOne: false
            referencedRelation: "review_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      review_cases: {
        Row: {
          approved_at: string | null
          assigned_at: string | null
          assigned_glosador_user_id: string | null
          branch_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          document_type_id: string | null
          executive_id: string | null
          first_started_at: string | null
          id: string
          internal_folio: string
          is_active_remesa: boolean | null
          last_started_at: string | null
          parent_case_id: string | null
          paused_at: string | null
          reference: string | null
          registered_at: string
          rejected_at: string | null
          remesa_base_reference: string | null
          remesa_revision_number: number | null
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved_at?: string | null
          assigned_at?: string | null
          assigned_glosador_user_id?: string | null
          branch_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          document_type_id?: string | null
          executive_id?: string | null
          first_started_at?: string | null
          id?: string
          internal_folio: string
          is_active_remesa?: boolean | null
          last_started_at?: string | null
          parent_case_id?: string | null
          paused_at?: string | null
          reference?: string | null
          registered_at?: string
          rejected_at?: string | null
          remesa_base_reference?: string | null
          remesa_revision_number?: number | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved_at?: string | null
          assigned_at?: string | null
          assigned_glosador_user_id?: string | null
          branch_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          document_type_id?: string | null
          executive_id?: string | null
          first_started_at?: string | null
          id?: string
          internal_folio?: string
          is_active_remesa?: boolean | null
          last_started_at?: string | null
          parent_case_id?: string | null
          paused_at?: string | null
          reference?: string | null
          registered_at?: string
          rejected_at?: string | null
          remesa_base_reference?: string | null
          remesa_revision_number?: number | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_cases_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_cases_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_cases_executive_id_fkey"
            columns: ["executive_id"]
            isOneToOne: false
            referencedRelation: "executives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_cases_parent_case_id_fkey"
            columns: ["parent_case_id"]
            isOneToOne: false
            referencedRelation: "review_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      review_findings: {
        Row: {
          category_id: string | null
          comentario_inicial: string | null
          created_at: string
          created_by: string | null
          current_status: string
          id: string
          is_open: boolean
          observation_error_id: string | null
          review_case_id: string
          review_round_id: string | null
          subcategory_id: string | null
        }
        Insert: {
          category_id?: string | null
          comentario_inicial?: string | null
          created_at?: string
          created_by?: string | null
          current_status?: string
          id?: string
          is_open?: boolean
          observation_error_id?: string | null
          review_case_id: string
          review_round_id?: string | null
          subcategory_id?: string | null
        }
        Update: {
          category_id?: string | null
          comentario_inicial?: string | null
          created_at?: string
          created_by?: string | null
          current_status?: string
          id?: string
          is_open?: boolean
          observation_error_id?: string | null
          review_case_id?: string
          review_round_id?: string | null
          subcategory_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_findings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "observation_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_findings_observation_error_id_fkey"
            columns: ["observation_error_id"]
            isOneToOne: false
            referencedRelation: "observation_errors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_findings_review_case_id_fkey"
            columns: ["review_case_id"]
            isOneToOne: false
            referencedRelation: "review_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_findings_review_round_id_fkey"
            columns: ["review_round_id"]
            isOneToOne: false
            referencedRelation: "review_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_findings_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "observation_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      review_rounds: {
        Row: {
          closed_at: string | null
          id: string
          result_status: string | null
          review_case_id: string
          reviewer_user_id: string | null
          round_number: number
          round_type: string | null
          started_at: string
        }
        Insert: {
          closed_at?: string | null
          id?: string
          result_status?: string | null
          review_case_id: string
          reviewer_user_id?: string | null
          round_number?: number
          round_type?: string | null
          started_at?: string
        }
        Update: {
          closed_at?: string | null
          id?: string
          result_status?: string | null
          review_case_id?: string
          reviewer_user_id?: string | null
          round_number?: number
          round_type?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_rounds_review_case_id_fkey"
            columns: ["review_case_id"]
            isOneToOne: false
            referencedRelation: "review_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      review_scores: {
        Row: {
          calculated_at: string
          calculated_by: string | null
          correction_rounds: number | null
          id: string
          review_case_id: string
          score_classification: number | null
          score_observations: number | null
          score_total: number | null
          total_errors: number | null
        }
        Insert: {
          calculated_at?: string
          calculated_by?: string | null
          correction_rounds?: number | null
          id?: string
          review_case_id: string
          score_classification?: number | null
          score_observations?: number | null
          score_total?: number | null
          total_errors?: number | null
        }
        Update: {
          calculated_at?: string
          calculated_by?: string | null
          correction_rounds?: number | null
          id?: string
          review_case_id?: string
          score_classification?: number | null
          score_observations?: number | null
          score_total?: number | null
          total_errors?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "review_scores_review_case_id_fkey"
            columns: ["review_case_id"]
            isOneToOne: false
            referencedRelation: "review_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      review_sessions: {
        Row: {
          duration_seconds: number | null
          ended_at: string | null
          id: string
          paused_at: string | null
          review_case_id: string
          session_status: string
          started_at: string
          user_id: string
        }
        Insert: {
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          paused_at?: string | null
          review_case_id: string
          session_status?: string
          started_at?: string
          user_id: string
        }
        Update: {
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          paused_at?: string | null
          review_case_id?: string
          session_status?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_sessions_review_case_id_fkey"
            columns: ["review_case_id"]
            isOneToOne: false
            referencedRelation: "review_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_rule_error_penalties: {
        Row: {
          id: string
          observation_error_id: string
          penalty_points: number
          scoring_rule_id: string
        }
        Insert: {
          id?: string
          observation_error_id: string
          penalty_points?: number
          scoring_rule_id: string
        }
        Update: {
          id?: string
          observation_error_id?: string
          penalty_points?: number
          scoring_rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scoring_rule_error_penalties_observation_error_id_fkey"
            columns: ["observation_error_id"]
            isOneToOne: false
            referencedRelation: "observation_errors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scoring_rule_error_penalties_scoring_rule_id_fkey"
            columns: ["scoring_rule_id"]
            isOneToOne: false
            referencedRelation: "scoring_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_rules: {
        Row: {
          activo: boolean
          classification_weight: number
          id: string
          nombre: string
          observations_weight: number
          valor_base: number
        }
        Insert: {
          activo?: boolean
          classification_weight?: number
          id?: string
          nombre: string
          observations_weight?: number
          valor_base?: number
        }
        Update: {
          activo?: boolean
          classification_weight?: number
          id?: string
          nombre?: string
          observations_weight?: number
          valor_base?: number
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "glosa"
      review_status:
        | "REGISTRADO"
        | "ASIGNADO"
        | "EN_REVISION"
        | "PAUSADO"
        | "CORRECCION_PENDIENTE"
        | "EN_CORRECCION"
        | "APROBADO"
        | "RECHAZADO"
        | "REABIERTO"
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
      app_role: ["admin", "glosa"],
      review_status: [
        "REGISTRADO",
        "ASIGNADO",
        "EN_REVISION",
        "PAUSADO",
        "CORRECCION_PENDIENTE",
        "EN_CORRECCION",
        "APROBADO",
        "RECHAZADO",
        "REABIERTO",
      ],
    },
  },
} as const
