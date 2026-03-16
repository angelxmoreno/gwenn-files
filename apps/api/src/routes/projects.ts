import { Hono } from 'hono'
import { createSupabaseClient } from '../lib/supabase'
import { authMiddleware } from '../middleware/auth'
import type { Bindings } from '../index'
import type { AuthVariables } from '../middleware/auth'
import type { CreateProjectRequest, UpdateProjectRequest } from '@gwenn/shared'

export const projectRoutes = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>()

projectRoutes.use('*', authMiddleware)

projectRoutes.get('/projects', async (c) => {
  const supabase = createSupabaseClient(c.env)
  const userId = c.get('userId')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  let projects

  if (profile?.role === 'admin') {
    const { data, error } = await supabase
      .from('projects')
      .select('*, owner:users!owner_id(id, display_name, avatar_url)')
      .order('created_at', { ascending: false })

    if (error) return c.json({ error: 'Failed to fetch projects' }, 500)
    projects = data
  } else {
    const { data: memberRows, error: memberError } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId)

    if (memberError) return c.json({ error: 'Failed to fetch projects' }, 500)

    const projectIds = memberRows.map((r) => r.project_id)

    if (projectIds.length === 0) {
      return c.json({ data: [] })
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*, owner:users!owner_id(id, display_name, avatar_url)')
      .in('id', projectIds)
      .order('created_at', { ascending: false })

    if (error) return c.json({ error: 'Failed to fetch projects' }, 500)
    projects = data
  }

  const projectsWithCounts = await Promise.all(
    (projects ?? []).map(async (project) => {
      const [{ count: memberCount }, { count: trackCount }] = await Promise.all([
        supabase
          .from('project_members')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id),
        supabase
          .from('tracks')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id),
      ])
      return {
        ...project,
        member_count: memberCount ?? 0,
        track_count: trackCount ?? 0,
      }
    }),
  )

  return c.json({ data: projectsWithCounts })
})

projectRoutes.post('/projects', async (c) => {
  const supabase = createSupabaseClient(c.env)
  const userId = c.get('userId')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json<CreateProjectRequest>()
  const { title, description } = body

  if (!title) {
    return c.json({ error: 'Title is required' }, 422)
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      title,
      description: description ?? null,
      owner_id: userId,
    })
    .select()
    .single()

  if (error || !project) {
    return c.json({ error: 'Failed to create project' }, 500)
  }

  await supabase.from('project_members').insert({
    project_id: project.id,
    user_id: userId,
    permission: 'owner',
  })

  return c.json({ data: project }, 201)
})

projectRoutes.get('/projects/:id', async (c) => {
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
      return c.json({ error: 'Not found' }, 404)
    }
  }

  const { data: project, error } = await supabase
    .from('projects')
    .select(
      `
      *,
      members:project_members(
        id,
        project_id,
        user_id,
        permission,
        joined_at,
        user:users(id, display_name, avatar_url)
      )
    `,
    )
    .eq('id', projectId)
    .single()

  if (error || !project) {
    return c.json({ error: 'Not found' }, 404)
  }

  return c.json({ data: project })
})

projectRoutes.patch('/projects/:id', async (c) => {
  const supabase = createSupabaseClient(c.env)
  const userId = c.get('userId')
  const projectId = c.req.param('id')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single()

  if (!project) {
    return c.json({ error: 'Not found' }, 404)
  }

  const isAdmin = profile?.role === 'admin'
  const isOwner = project.owner_id === userId

  if (!isAdmin && !isOwner) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json<UpdateProjectRequest>()
  const updates: Record<string, unknown> = {}

  if (body.title !== undefined) updates['title'] = body.title
  if (body.description !== undefined) updates['description'] = body.description

  if (Object.keys(updates).length === 0) {
    return c.json({ error: 'No fields to update' }, 422)
  }

  updates['updated_at'] = new Date().toISOString()

  const { data: updated, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single()

  if (error) {
    return c.json({ error: 'Failed to update project' }, 500)
  }

  return c.json({ data: updated })
})

projectRoutes.delete('/projects/:id', async (c) => {
  const supabase = createSupabaseClient(c.env)
  const userId = c.get('userId')
  const projectId = c.req.param('id')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (profile?.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const { error } = await supabase.from('projects').delete().eq('id', projectId)

  if (error) {
    return c.json({ error: 'Failed to delete project' }, 500)
  }

  return c.json({ success: true })
})

projectRoutes.get('/projects/:id/members', async (c) => {
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

  const { data: members, error } = await supabase
    .from('project_members')
    .select(
      `
      id,
      project_id,
      user_id,
      permission,
      joined_at,
      user:users(id, display_name, avatar_url)
    `,
    )
    .eq('project_id', projectId)

  if (error) {
    return c.json({ error: 'Failed to fetch members' }, 500)
  }

  return c.json({ data: members })
})

projectRoutes.delete('/projects/:id/members/:userId', async (c) => {
  const supabase = createSupabaseClient(c.env)
  const requestingUserId = c.get('userId')
  const projectId = c.req.param('id')
  const targetUserId = c.req.param('userId')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', requestingUserId)
    .single()

  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single()

  if (!project) {
    return c.json({ error: 'Not found' }, 404)
  }

  const isAdmin = profile?.role === 'admin'
  const isOwner = project.owner_id === requestingUserId

  if (!isAdmin && !isOwner) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', targetUserId)

  if (error) {
    return c.json({ error: 'Failed to remove member' }, 500)
  }

  return c.json({ success: true })
})
