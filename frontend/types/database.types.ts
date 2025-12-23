export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      [key: string]: any
    }
    Views: {
      [key: string]: any
    }
    Functions: {
      [key: string]: any
    }
    Enums: {
      [key: string]: any
    }
  }
  app_auth: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          domain: string | null
          settings: Json | null
          subscription_tier: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          domain?: string | null
          settings?: Json | null
          subscription_tier?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          domain?: string | null
          settings?: Json | null
          subscription_tier?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          organization_id: string | null
          role: 'admin' | 'team_lead' | 'senior' | 'middle' | 'junior' | 'observer'
          department: string | null
          ai_assistant_mode: string | null
          preferences: Json | null
          created_at: string | null
          last_login: string | null
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          avatar_url?: string | null
          organization_id?: string | null
          role: 'admin' | 'team_lead' | 'senior' | 'middle' | 'junior' | 'observer'
          department?: string | null
          ai_assistant_mode?: string | null
          preferences?: Json | null
          created_at?: string | null
          last_login?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string | null
          organization_id?: string | null
          role?: 'admin' | 'team_lead' | 'senior' | 'middle' | 'junior' | 'observer'
          department?: string | null
          ai_assistant_mode?: string | null
          preferences?: Json | null
          created_at?: string | null
          last_login?: string | null
        }
      }
    }
  }
  app_projects: {
    Tables: {
      projects: {
        Row: {
          id: string
          organization_id: string | null
          name: string
          description: string | null
          project_type: 'insurance' | 'development' | 'analytics' | 'operations' | null
          status: string | null
          owner_id: string | null
          start_date: string | null
          end_date: string | null
          budget: number | null
          ai_insights: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          organization_id?: string | null
          name: string
          description?: string | null
          project_type?: 'insurance' | 'development' | 'analytics' | 'operations' | null
          status?: string | null
          owner_id?: string | null
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          ai_insights?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string | null
          name?: string
          description?: string | null
          project_type?: 'insurance' | 'development' | 'analytics' | 'operations' | null
          status?: string | null
          owner_id?: string | null
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          ai_insights?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      boards: {
        Row: {
          id: string
          project_id: string | null
          name: string
          description: string | null
          board_type: string | null
          settings: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          name: string
          description?: string | null
          board_type?: string | null
          settings?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          name?: string
          description?: string | null
          board_type?: string | null
          settings?: Json | null
          created_at?: string | null
        }
      }
      board_columns: {
        Row: {
          id: string
          board_id: string | null
          name: string
          position: number
          wip_limit: number | null
          color: string | null
          automation_rules: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          board_id?: string | null
          name: string
          position: number
          wip_limit?: number | null
          color?: string | null
          automation_rules?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          board_id?: string | null
          name?: string
          position?: number
          wip_limit?: number | null
          color?: string | null
          automation_rules?: Json | null
          created_at?: string | null
        }
      }
    }
  }
  app_tasks: {
    Tables: {
      tasks: {
        Row: {
          id: string
          board_id: string | null
          column_id: string | null
          organization_id: string | null
          title: string
          description: string | null
          task_type: 'feature' | 'bug' | 'improvement' | 'research' | 'documentation' | null
          priority: 'P1' | 'P2' | 'P3' | 'P4' | null
          status: string | null
          weight: number
          estimated_hours: number | null
          ai_predicted_hours: number | null
          actual_hours: number | null
          complexity_score: number | null
          due_date: string | null
          created_by: string | null
          assigned_to: string | null
          parent_task_id: string | null
          ai_decomposition: Json | null
          ai_suggestions: Json | null
          tags: string[] | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          board_id?: string | null
          column_id?: string | null
          organization_id?: string | null
          title: string
          description?: string | null
          task_type?: 'feature' | 'bug' | 'improvement' | 'research' | 'documentation' | null
          priority?: 'P1' | 'P2' | 'P3' | 'P4' | null
          status?: string | null
          weight?: number
          estimated_hours?: number | null
          ai_predicted_hours?: number | null
          actual_hours?: number | null
          complexity_score?: number | null
          due_date?: string | null
          created_by?: string | null
          assigned_to?: string | null
          parent_task_id?: string | null
          ai_decomposition?: Json | null
          ai_suggestions?: Json | null
          tags?: string[] | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          board_id?: string | null
          column_id?: string | null
          organization_id?: string | null
          title?: string
          description?: string | null
          task_type?: 'feature' | 'bug' | 'improvement' | 'research' | 'documentation' | null
          priority?: 'P1' | 'P2' | 'P3' | 'P4' | null
          status?: string | null
          weight?: number
          estimated_hours?: number | null
          ai_predicted_hours?: number | null
          actual_hours?: number | null
          complexity_score?: number | null
          due_date?: string | null
          created_by?: string | null
          assigned_to?: string | null
          parent_task_id?: string | null
          ai_decomposition?: Json | null
          ai_suggestions?: Json | null
          tags?: string[] | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
        }
      }
      comments: {
        Row: {
          id: string
          task_id: string | null
          user_id: string | null
          content: string
          ai_generated: boolean | null
          mentions: string[] | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          task_id?: string | null
          user_id?: string | null
          content: string
          ai_generated?: boolean | null
          mentions?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          task_id?: string | null
          user_id?: string | null
          content?: string
          ai_generated?: boolean | null
          mentions?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Functions: {
      reposition_task: {
        Args: {
          task_id: string
          new_column_id: string
          new_position: number
        }
        Returns: number
      }
    }
  }
  app_ai: {
    Tables: {
      assistants: {
        Row: {
          id: string
          name: string
          assistant_type: 'business_analyst' | 'task_decomposer' | 'admin_analytics' | 'code_reviewer' | 'risk_assessor' | null
          description: string | null
          system_prompt: string
          model_config: Json | null
          available_for_roles: string[] | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          assistant_type?: 'business_analyst' | 'task_decomposer' | 'admin_analytics' | 'code_reviewer' | 'risk_assessor' | null
          description?: string | null
          system_prompt: string
          model_config?: Json | null
          available_for_roles?: string[] | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          assistant_type?: 'business_analyst' | 'task_decomposer' | 'admin_analytics' | 'code_reviewer' | 'risk_assessor' | null
          description?: string | null
          system_prompt?: string
          model_config?: Json | null
          available_for_roles?: string[] | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
  }
}
