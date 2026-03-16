import type { User } from './user'

export type ProjectPermission = 'owner' | 'contributor'

export interface Project {
  id: string
  owner_id: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  permission: ProjectPermission
  joined_at: string
}

export interface ProjectWithMembers extends Project {
  members: Array<ProjectMember & { user: Pick<User, 'id' | 'display_name' | 'avatar_url'> }>
}

export interface ProjectWithOwner extends Project {
  owner: Pick<User, 'id' | 'display_name' | 'avatar_url'>
  member_count: number
  track_count: number
}
