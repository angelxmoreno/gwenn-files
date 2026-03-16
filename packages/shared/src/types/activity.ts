export type ActivityType =
  | 'uploaded'
  | 'commented'
  | 'invited'
  | 'joined'
  | 'new_version'

export interface Activity {
  id: string
  project_id: string
  actor_id: string
  type: ActivityType
  payload: Record<string, unknown> | null
  created_at: string
}
