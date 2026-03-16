export type UserRole = 'admin' | 'manager' | 'contributor'

export interface User {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
}
