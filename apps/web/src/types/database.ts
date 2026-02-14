export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          plan: 'free' | 'pro' | 'team'
          sessions_used_this_month: number
          billing_cycle_start: string
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          plan?: 'free' | 'pro' | 'team'
          sessions_used_this_month?: number
          billing_cycle_start?: string
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          plan?: 'free' | 'pro' | 'team'
          sessions_used_this_month?: number
          billing_cycle_start?: string
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          url: string | null
          description: string | null
          favicon_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          url?: string | null
          description?: string | null
          favicon_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          url?: string | null
          description?: string | null
          favicon_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          project_id: string | null
          user_id: string
          page_url: string
          page_title: string | null
          status: 'active' | 'completed' | 'discarded'
          before_html: string | null
          after_html: string | null
          before_css: string | null
          after_css: string | null
          before_screenshot: string | null
          after_screenshot: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          user_id: string
          page_url: string
          page_title?: string | null
          status?: 'active' | 'completed' | 'discarded'
          before_html?: string | null
          after_html?: string | null
          before_css?: string | null
          after_css?: string | null
          before_screenshot?: string | null
          after_screenshot?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string | null
          user_id?: string
          page_url?: string
          page_title?: string | null
          status?: 'active' | 'completed' | 'discarded'
          before_html?: string | null
          after_html?: string | null
          before_css?: string | null
          after_css?: string | null
          before_screenshot?: string | null
          after_screenshot?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          screenshot_url: string | null
          tool_name: string | null
          tool_input: Json | null
          tool_output: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          screenshot_url?: string | null
          tool_name?: string | null
          tool_input?: Json | null
          tool_output?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          screenshot_url?: string | null
          tool_name?: string | null
          tool_input?: Json | null
          tool_output?: string | null
          created_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          session_id: string | null
          project_id: string
          user_id: string
          title: string
          description: string | null
          prompt: string
          status: 'open' | 'in_progress' | 'done'
          before_screenshot: string | null
          after_screenshot: string | null
          page_url: string | null
          changes_summary: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id?: string | null
          project_id: string
          user_id: string
          title: string
          description?: string | null
          prompt: string
          status?: 'open' | 'in_progress' | 'done'
          before_screenshot?: string | null
          after_screenshot?: string | null
          page_url?: string | null
          changes_summary?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string | null
          project_id?: string
          user_id?: string
          title?: string
          description?: string | null
          prompt?: string
          status?: 'open' | 'in_progress' | 'done'
          before_screenshot?: string | null
          after_screenshot?: string | null
          page_url?: string | null
          changes_summary?: Json | null
          created_at?: string
          updated_at?: string
        }
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
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
