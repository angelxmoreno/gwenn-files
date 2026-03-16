import { Hono } from 'hono'
import { createSupabaseClient } from '../lib/supabase'
import { authMiddleware } from '../middleware/auth'
import { createNotification, createActivity } from '../lib/notifications'
import type { Bindings } from '../index'
import type { AuthVariables } from '../middleware/auth'
import type { CreateTrackRequest } from '@gwenn/shared'

export const trackRoutes = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>()

trackRoutes.use('*', authMiddleware)

trackRoutes.get('/projects/:id/tracks', async (c) => {
  const supabase = createSupabaseClient(c.env)
  const userId = c.get('userId')
  const projectId = c.req.param('id')

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

  const { data: tracks, error } = await supabase
    .from('tracks')
    .select(
      `
      *,
      uploader:users!uploaded_by(id, display_name, avatar_url)
    `,
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    return c.json({ error: 'Failed to fetch tracks' }, 500)
  }

  return c.json({ data: tracks })
})

trackRoutes.post('/tracks', async (c) => {
  const supabase = createSupabaseClient(c.env)
  const userId = c.get('userId')

  const body = await c.req.json<CreateTrackRequest>()
  const { project_id, name, file_key, file_size, mime_type, duration, parent_id } = body

  if (!project_id || !name || !file_key) {
    return c.json({ error: 'project_id, name, and file_key are required' }, 422)
  }

  const { data: membership } = await supabase
    .from('project_members')
    .select('id')
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

  let version = 1
  let activityType: 'uploaded' | 'new_version' = 'uploaded'

  if (parent_id) {
    const { data: parentTrack } = await supabase
      .from('tracks')
      .select('version')
      .eq('id', parent_id)
      .single()

    if (parentTrack) {
      version = parentTrack.version + 1
      activityType = 'new_version'
    }
  }

  const { data: track, error } = await supabase
    .from('tracks')
    .insert({
      project_id,
      name,
      file_key,
      file_size: file_size ?? null,
      mime_type: mime_type ?? null,
      duration_seconds: duration ?? null,
      parent_id: parent_id ?? null,
      uploaded_by: userId,
      version,
    })
    .select()
    .single()

  if (error || !track) {
    return c.json({ error: 'Failed to create track' }, 500)
  }

  const { data: members } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', project_id)
    .neq('user_id', userId)

  const notificationType = parent_id ? 'new_version_uploaded' : 'file_uploaded'

  const { data: uploader } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', userId)
    .single()

  if (members && members.length > 0) {
    await Promise.all(
      members.map((member) =>
        createNotification(supabase, member.user_id, notificationType, {
          track_id: track.id,
          track_name: name,
          project_id,
          uploaded_by_user_id: userId,
          uploaded_by_display_name: uploader?.display_name,
        }),
      ),
    )
  }

  await createActivity(supabase, project_id, userId, activityType, {
    track_id: track.id,
    track_name: name,
    parent_id: parent_id ?? null,
  })

  return c.json({ data: track }, 201)
})

trackRoutes.delete('/tracks/:id', async (c) => {
  const supabase = createSupabaseClient(c.env)
  const userId = c.get('userId')
  const trackId = c.req.param('id')

  const { data: track } = await supabase
    .from('tracks')
    .select('project_id, uploaded_by')
    .eq('id', trackId)
    .single()

  if (!track) {
    return c.json({ error: 'Not found' }, 404)
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  const isAdmin = profile?.role === 'admin'

  if (!isAdmin) {
    const { data: membership } = await supabase
      .from('project_members')
      .select('permission')
      .eq('project_id', track.project_id)
      .eq('user_id', userId)
      .single()

    if (!membership || (membership.permission !== 'owner' && profile?.role !== 'manager')) {
      return c.json({ error: 'Forbidden' }, 403)
    }
  }

  const { error } = await supabase.from('tracks').delete().eq('id', trackId)

  if (error) {
    return c.json({ error: 'Failed to delete track' }, 500)
  }

  return c.json({ success: true })
})
