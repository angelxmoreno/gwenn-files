import type { Context, Next } from 'hono'
import type { User } from '@supabase/supabase-js'
import { createSupabaseClient } from '../lib/supabase'
import type { Bindings } from '../index'

export type AuthVariables = {
  user: User
  userId: string
}

export async function authMiddleware(
  c: Context<{ Bindings: Bindings; Variables: AuthVariables }>,
  next: Next,
): Promise<Response | void> {
  const authorization = c.req.header('Authorization')

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authorization.slice(7)

  const supabase = createSupabaseClient(c.env)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('user', user)
  c.set('userId', user.id)

  await next()
}
