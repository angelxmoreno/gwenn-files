import { Hono } from 'hono'
import { createSupabaseClient } from '../lib/supabase'
import { authMiddleware } from '../middleware/auth'
import type { Bindings } from '../index'
import type { AuthVariables } from '../middleware/auth'
import type { MarkNotificationsReadRequest } from '@gwenn/shared'

export const notificationRoutes = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>()

notificationRoutes.use('*', authMiddleware)

notificationRoutes.get('/notifications', async (c) => {
  const supabase = createSupabaseClient(c.env)
  const userId = c.get('userId')

  const page = parseInt(c.req.query('page') ?? '1', 10)
  const limit = parseInt(c.req.query('limit') ?? '20', 10)
  const offset = (page - 1) * limit

  const { data: notifications, error, count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return c.json({ error: 'Failed to fetch notifications' }, 500)
  }

  return c.json({
    data: notifications,
    total: count ?? 0,
    page,
    per_page: limit,
  })
})

notificationRoutes.post('/notifications/read', async (c) => {
  const supabase = createSupabaseClient(c.env)
  const userId = c.get('userId')

  const body = await c.req.json<Partial<MarkNotificationsReadRequest>>()
  const { ids } = body

  const readAt = new Date().toISOString()

  if (ids && ids.length > 0) {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .in('id', ids)
      .eq('user_id', userId)
      .is('read_at', null)

    if (error) {
      return c.json({ error: 'Failed to mark notifications as read' }, 500)
    }
  } else {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: readAt })
      .eq('user_id', userId)
      .is('read_at', null)

    if (error) {
      return c.json({ error: 'Failed to mark notifications as read' }, 500)
    }
  }

  return c.json({ success: true })
})
