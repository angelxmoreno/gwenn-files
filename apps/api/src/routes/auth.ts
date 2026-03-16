import { Hono } from 'hono'
import { createSupabaseClient } from '../lib/supabase'
import { authMiddleware } from '../middleware/auth'
import type { Bindings } from '../index'
import type { AuthVariables } from '../middleware/auth'
import type { AuthSignupRequest, AuthLoginRequest } from '@gwenn/shared'

export const authRoutes = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>()

authRoutes.post('/signup', async (c) => {
  const body = await c.req.json<AuthSignupRequest>()
  const { email, password, display_name, invite_token } = body

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 422)
  }

  const supabase = createSupabaseClient(c.env)

  const {
    data: { user },
    error: createError,
  } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError || !user) {
    return c.json({ error: createError?.message ?? 'Failed to create user' }, 400)
  }

  const { error: insertError } = await supabase.from('users').insert({
    id: user.id,
    email: user.email,
    display_name: display_name ?? null,
    role: 'contributor',
  })

  if (insertError) {
    await supabase.auth.admin.deleteUser(user.id)
    return c.json({ error: 'Failed to create user profile' }, 500)
  }

  if (invite_token) {
    const { data: invite } = await supabase
      .from('invites')
      .select('*')
      .eq('token', invite_token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (invite) {
      await supabase.from('project_members').insert({
        project_id: invite.project_id,
        user_id: user.id,
        permission: 'contributor',
      })

      await supabase
        .from('invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id)
    }
  }

  const {
    data: { session },
    error: signInError,
  } = await supabase.auth.signInWithPassword({ email, password })

  if (signInError || !session) {
    return c.json({ error: 'User created but login failed' }, 500)
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return c.json(
    {
      user: profile,
      token: session.access_token,
    },
    201,
  )
})

authRoutes.post('/login', async (c) => {
  const body = await c.req.json<AuthLoginRequest>()
  const { email, password } = body

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 422)
  }

  const supabase = createSupabaseClient(c.env)

  const {
    data: { session },
    error,
  } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !session) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  return c.json({
    user: profile,
    token: session.access_token,
  })
})

authRoutes.post('/logout', authMiddleware, async (c) => {
  const authorization = c.req.header('Authorization')
  const token = authorization!.slice(7)

  const supabase = createSupabaseClient(c.env)

  const { data: { user } } = await supabase.auth.getUser(token)
  if (user) {
    await supabase.auth.admin.signOut(user.id)
  }

  return c.json({ success: true })
})
