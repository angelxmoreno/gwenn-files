import type { User } from './user'

export interface Comment {
  id: string
  track_id: string
  user_id: string
  body: string
  timestamp_seconds: number | null
  created_at: string
}

export interface CommentWithUser extends Comment {
  user: Pick<User, 'id' | 'display_name' | 'avatar_url'>
}
