import { Hono } from 'hono'
import { createSupabaseClient } from '../lib/supabase'
import { authMiddleware } from '../middleware/auth'
import { sendInviteEmail } from '../lib/email'
import { createNotification, createActivity } from '../lib/notifications'
import type { Bindings } from '../index'
import type { AuthVariables } from '../middleware/auth'
import type { CreateInviteRequest } from '@gwenn/shared'

export const inviteRoutes = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>()

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

inviteRoutes.post('/invites', authMiddleware, async (c) => {
  const supabase = createSupabaseClient(c.env)
  const userId = c.get('userId')

  const body = await c.req.json<CreateInviteRequest>()
  const { project_id, email } = body

  if (!project_id || !email) {
    return c.json({ error: 'project_id and email are required' }, 422)
  }

  const { data: membership } = await supabase
    .from('project_members')
    .select('permission')
    .eq('project_id', project_id)
    .eq('user_id', userId)
    .single()

  if (!membership) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403)
    }
  }

  const { data: project } = await supabase
    .from('projects')
    .select('title')
    .eq('id', project_id)
    .single()

  if (!project) {
    return c.json({ error: 'Project not found' }, 404)
  }

  const { data: existingInvite } = await supabase
    .from('invites')
    .select('id')
    .eq('project_id', project_id)
    .eq('invited_email', email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existingInvite) {
    return c.json({ error: 'An active invite already exists for this email' }, 409)
  }

  const token = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: invite, error } = await supabase
    .from('invites')
    .insert({
      project_id,
      invited_email: email,
      invited_by: userId,
      token,
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (error || !invite) {
    return c.json({ error: 'Failed to create invite' }, 500)
  }

  try {
    await sendInviteEmail(c.env, email, project.title, token, c.env.APP_URL)
  } catch (emailError) {
    console.error('Failed to send invite email:', emailError)
  }

  await createActivity(supabase, project_id, userId, 'invited', {
    invited_email: email,
    invite_id: invite.id,
  })

  return c.json({ data: invite }, 201)
})

inviteRoutes.get('/invites/:token', async (c) => {
  const supabase = createSupabaseClient(c.env)
  const token = c.req.param('token')

  const { data: invite, error } = await supabase
    .from('invites')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !invite) {
    return c.json({ error: 'Invite not found' }, 404)
  }

  if (invite.accepted_at) {
    return c.json({ error: 'Invite already accepted' }, 410)
  }

  if (new Date(invite.expires_at) < new Date()) {
    return c.json({ error: 'Invite expired' }, 410)
  }

  const [{ data: project }, { data: inviter }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, title, description')
      .eq('id', invite.project_id)
      .single(),
    supabase
      .from('users')
      .select('id, display_name, avatar_url')
      .eq('id', invite.invited_by)
      .single(),
  ])

  return c.json({
    data: {
      invite,
      project,
      inviter,
    },
  })
})

inviteRoutes.post('/invites/:token/accept', authMiddleware, async (c) => {
  const supabase = createSupabaseClient(c.env)
  const userId = c.get('userId')
  const token = c.req.param('token')

  const { data: invite, error } = await supabase
    .from('invites')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !invite) {
    return c.json({ error: 'Invite not found' }, 404)
  }

  if (invite.accepted_at) {
    return c.json({ error: 'Invite already accepted' }, 410)
  }

  if (new Date(invite.expires_at) < new Date()) {
    return c.json({ error: 'Invite expired' }, 410)
  }

  const { data: existingMember } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', invite.project_id)
    .eq('user_id', userId)
    .single()

  if (!existingMember) {
    const { error: memberError } = await supabase.from('project_members').insert({
      project_id: invite.project_id,
      user_id: userId,
      permission: 'contributor',
    })

    if (memberError) {
      return c.json({ error: 'Failed to join project' }, 500)
    }
  }

  await supabase
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  const { data: acceptingUser } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', userId)
    .single()

  const { data: project } = await supabase
    .from('projects')
    .select('title')
    .eq('id', invite.project_id)
    .single()

  await createNotification(supabase, invite.invited_by, 'invite_accepted', {
    accepted_by_user_id: userId,
    accepted_by_display_name: acceptingUser?.display_name,
    project_id: invite.project_id,
    project_title: project?.title,
  })

  await createActivity(supabase, invite.project_id, userId, 'joined', {
    invite_id: invite.id,
  })

  return c.json({ success: true, project_id: invite.project_id })
})
