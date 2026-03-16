import { Hono } from 'hono'
import { createSupabaseClient } from '../lib/supabase'
import { getPresignedPutUrl } from '../lib/r2'
import { authMiddleware } from '../middleware/auth'
import type { Bindings } from '../index'
import type { AuthVariables } from '../middleware/auth'
import type { PresignUploadRequest } from '@gwenn/shared'

export const uploadRoutes = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>()

uploadRoutes.use('*', authMiddleware)

uploadRoutes.post('/presign', async (c) => {
  const supabase = createSupabaseClient(c.env)
  const userId = c.get('userId')

  const body = await c.req.json<PresignUploadRequest>()
  const { project_id, file_name, mime_type, file_size } = body

  if (!project_id || !file_name || !mime_type || !file_size) {
    return c.json({ error: 'project_id, file_name, mime_type, and file_size are required' }, 422)
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

  const timestamp = Date.now()
  const sanitizedFileName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const fileKey = `projects/${project_id}/${userId}/${timestamp}_${sanitizedFileName}`

  try {
    const uploadUrl = await getPresignedPutUrl(c.env, fileKey, mime_type, file_size)
    return c.json({ data: { upload_url: uploadUrl, file_key: fileKey } })
  } catch (err) {
    console.error('Failed to generate presigned URL:', err)
    return c.json({ error: 'Failed to generate upload URL' }, 500)
  }
})
