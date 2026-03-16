import { Hono } from 'hono'
import { createSupabaseClient } from '../lib/supabase'
import { authMiddleware } from '../middleware/auth'
import { createNotification, createActivity } from '../lib/notifications'
import type { Bindings } from '../index'
import type { AuthVariables } from '../middleware/auth'
import type { CreateCommentRequest } from '@gwenn/shared'

export const commentRoutes = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>()

commentRoutes.use('*', authMiddleware)

commentRoutes.get('/tracks/:id/comments', async (c) => {
  const supabase = createSupabaseClient(c.env)
  const userId = c.get('userId')
  const trackId = c.req.param('id')

  const { data: track } = await supabase
    .from('tracks')
    .select('project_id')
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

  if (profile?.role !== 'admin') {
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', track.project_id)
      .eq('user_id', userId)
      .single()

    if (!membership) {
      return c.json({ error: 'Forbidden' }, 403)
    }
  }

  const { data: comments, error } = await supabase
    .from('comments')
    .select(
      `
      *,
      user:users(id, display_name, avatar_url)
    `,
    )
    .eq('track_id', trackId)
    .order('created_at', { ascending: true })

  if (error) {
    return c.json({ error: 'Failed to fetch comments' }, 500)
  }

  return c.json({ data: comments })
})

commentRoutes.post('/tracks/:id/comments', async (c) => {
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

  if (profile?.role !== 'admin') {
    const { data: membership } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', track.project_id)
      .eq('user_id', userId)
      .single()

    if (!membership) {
      return c.json({ error: 'Forbidden' }, 403)
    }
  }

  const body = await c.req.json<CreateCommentRequest>()
  const { body: commentBody, timestamp_seconds } = body

  if (!commentBody) {
    return c.json({ error: 'body is required' }, 422)
  }

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      track_id: trackId,
      user_id: userId,
      body: commentBody,
      timestamp_seconds: timestamp_seconds ?? null,
    })
    .select(
      `
      *,
      user:users(id, display_name, avatar_url)
    `,
    )
    .single()

  if (error || !comment) {
    return c.json({ error: 'Failed to create comment' }, 500)
  }

  const { data: commenter } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', userId)
    .single()

  const notificationPayload = {
    comment_id: comment.id,
    track_id: trackId,
    project_id: track.project_id,
    commented_by_user_id: userId,
    commented_by_display_name: commenter?.display_name,
    timestamp_seconds: timestamp_seconds ?? null,
  }

  const notifyUserIds = new Set<string>()

  if (track.uploaded_by !== userId) {
    notifyUserIds.add(track.uploaded_by)
  }

  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', track.project_id)
    .single()

  if (project && project.owner_id !== userId) {
    notifyUserIds.add(project.owner_id)
  }

  await Promise.all(
    Array.from(notifyUserIds).map((uid) =>
      createNotification(supabase, uid, 'comment_added', notificationPayload),
    ),
  )

  await createActivity(supabase, track.project_id, userId, 'commented', {
    comment_id: comment.id,
    track_id: trackId,
    timestamp_seconds: timestamp_seconds ?? null,
  })

  return c.json({ data: comment }, 201)
})

commentRoutes.delete('/comments/:id', async (c) => {
  const supabase = createSupabaseClient(c.env)
  const userId = c.get('userId')
  const commentId = c.req.param('id')

  const { data: comment } = await supabase
    .from('comments')
    .select('user_id')
    .eq('id', commentId)
    .single()

  if (!comment) {
    return c.json({ error: 'Not found' }, 404)
  }

  if (comment.user_id !== userId) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (profile?.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403)
    }
  }

  const { error } = await supabase.from('comments').delete().eq('id', commentId)

  if (error) {
    return c.json({ error: 'Failed to delete comment' }, 500)
  }

  return c.json({ success: true })
})
