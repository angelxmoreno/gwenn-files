import { Hono } from 'hono'
import { createSupabaseClient } from '../lib/supabase'
import { authMiddleware } from '../middleware/auth'
import type { Bindings } from '../index'
import type { AuthVariables } from '../middleware/auth'
import type { ChangeRoleRequest } from '@gwenn/shared'

export const adminRoutes = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>()

adminRoutes.use('*', authMiddleware)

adminRoutes.use('*', async (c, next) => {
  const supabase = createSupabaseClient(c.env)
  const userId = c.get('userId')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (profile?.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }

  await next()
})

adminRoutes.get('/users', async (c) => {
  const supabase = createSupabaseClient(c.env)

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return c.json({ error: 'Failed to fetch users' }, 500)
  }

  return c.json({ data: users })
})

adminRoutes.patch('/users/:id/role', async (c) => {
  const supabase = createSupabaseClient(c.env)
  const targetUserId = c.req.param('id')

  const body = await c.req.json<ChangeRoleRequest>()
  const { role } = body

  if (!role || !['admin', 'manager', 'contributor'].includes(role)) {
    return c.json({ error: 'Invalid role. Must be admin, manager, or contributor' }, 422)
  }

  const { data: targetUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', targetUserId)
    .single()

  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404)
  }

  const { data: updatedUser, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', targetUserId)
    .select()
    .single()

  if (error) {
    return c.json({ error: 'Failed to update role' }, 500)
  }

  return c.json({ data: updatedUser })
})
