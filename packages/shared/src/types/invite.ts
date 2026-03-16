import type { Project } from './project'
import type { User } from './user'

export interface Invite {
  id: string
  project_id: string
  invited_email: string
  invited_by: string
  token: string
  accepted_at: string | null
  expires_at: string
  created_at: string
}

export interface InviteDetails {
  invite: Invite
  project: Pick<Project, 'id' | 'title' | 'description'>
  inviter: Pick<User, 'id' | 'display_name' | 'avatar_url'>
}
