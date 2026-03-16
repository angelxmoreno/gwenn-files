export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          role: 'admin' | 'manager' | 'contributor'
          created_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'manager' | 'contributor'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'manager' | 'contributor'
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          description?: string | null
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          permission: 'owner' | 'contributor'
          joined_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          permission?: 'owner' | 'contributor'
          joined_at?: string
        }
        Update: {
          permission?: 'owner' | 'contributor'
        }
      }
      invites: {
        Row: {
          id: string
          project_id: string
          invited_email: string
          invited_by: string
          token: string
          accepted_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          invited_email: string
          invited_by: string
          token?: string
          accepted_at?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          accepted_at?: string | null
        }
      }
      tracks: {
        Row: {
          id: string
          project_id: string
          uploaded_by: string
          name: string
          file_key: string
          file_size: number | null
          mime_type: string | null
          duration_seconds: number | null
          version: number
          parent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          uploaded_by: string
          name: string
          file_key: string
          file_size?: number | null
          mime_type?: string | null
          duration_seconds?: number | null
          version?: number
          parent_id?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          duration_seconds?: number | null
        }
      }
      comments: {
        Row: {
          id: string
          track_id: string
          user_id: string
          body: string
          timestamp_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          track_id: string
          user_id: string
          body: string
          timestamp_seconds?: number | null
          created_at?: string
        }
        Update: {
          body?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type:
            | 'file_uploaded'
            | 'invite_accepted'
            | 'comment_added'
            | 'added_to_project'
            | 'new_version_uploaded'
          payload: Json | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type:
            | 'file_uploaded'
            | 'invite_accepted'
            | 'comment_added'
            | 'added_to_project'
            | 'new_version_uploaded'
          payload?: Json | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          read_at?: string | null
        }
      }
      activity: {
        Row: {
          id: string
          project_id: string
          actor_id: string
          type: 'uploaded' | 'commented' | 'invited' | 'joined' | 'new_version'
          payload: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          actor_id: string
          type: 'uploaded' | 'commented' | 'invited' | 'joined' | 'new_version'
          payload?: Json | null
          created_at?: string
        }
        Update: Record<string, never>
      }
    }
  }
}

// Convenience type helpers
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
