import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotificationType, NotificationPayload } from '@gwenn/shared'
import type { ActivityType } from '@gwenn/shared'

export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType,
  payload: NotificationPayload,
): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    payload,
  })

  if (error) {
    console.error('Failed to create notification:', error)
  }
}

export async function createActivity(
  supabase: SupabaseClient,
  projectId: string,
  actorId: string,
  type: ActivityType,
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('activity').insert({
    project_id: projectId,
    actor_id: actorId,
    type,
    payload,
  })

  if (error) {
    console.error('Failed to create activity:', error)
  }
}
