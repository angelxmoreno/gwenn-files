export type NotificationType =
  | 'file_uploaded'
  | 'invite_accepted'
  | 'comment_added'
  | 'added_to_project'
  | 'new_version_uploaded'

export type NotificationPayload = Record<string, unknown>

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  payload: NotificationPayload | null
  read_at: string | null
  created_at: string
}
