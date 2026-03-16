import { Hono } from 'hono'
import { createSupabaseClient } from '../lib/supabase'
import { authMiddleware } from '../middleware/auth'
import type { Bindings } from '../index'
import type { AuthVariables } from '../middleware/auth'

export const activityRoutes = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>()

activityRoutes.use('*', authMiddleware)

activityRoutes.get('/projects/:id/activity', async (c) => {
  const supabase = createSupabaseClient(c.env)
  const userId = c.get('userId')
  const projectId = c.req.param('id')

  const page = parseInt(c.req.query('page') ?? '1', 10)
  const limit = parseInt(c.req.query('limit') ?? '20', 10)
  const offset = (page - 1) * limit

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (profile?.role !== 'admin') {
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    if (!membership) {
      return c.json({ error: 'Forbidden' }, 403)
    }
  }

  const { data: activity, error, count } = await supabase
    .from('activity')
    .select(
      `
      *,
      actor:users!actor_id(id, display_name, avatar_url)
    `,
      { count: 'exact' },
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return c.json({ error: 'Failed to fetch activity' }, 500)
  }

  return c.json({
    data: activity,
    total: count ?? 0,
    page,
    per_page: limit,
  })
})
