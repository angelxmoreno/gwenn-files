import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authRoutes } from './routes/auth'
import { projectRoutes } from './routes/projects'
import { inviteRoutes } from './routes/invites'
import { uploadRoutes } from './routes/uploads'
import { trackRoutes } from './routes/tracks'
import { commentRoutes } from './routes/comments'
import { notificationRoutes } from './routes/notifications'
import { activityRoutes } from './routes/activity'
import { adminRoutes } from './routes/admin'

export type Bindings = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  R2_ACCOUNT_ID: string
  R2_ACCESS_KEY_ID: string
  R2_SECRET_ACCESS_KEY: string
  R2_BUCKET_NAME: string
  R2_PUBLIC_URL: string
  SMTP_HOST: string
  SMTP_PORT: string
  SMTP_USER: string
  SMTP_PASS: string
  SMTP_FROM: string
  JWT_SECRET: string
  APP_URL: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', logger())
app.use('*', cors({ origin: '*', credentials: true }))

app.route('/api/auth', authRoutes)
app.route('/api', projectRoutes)
app.route('/api', inviteRoutes)
app.route('/api/uploads', uploadRoutes)
app.route('/api', trackRoutes)
app.route('/api', commentRoutes)
app.route('/api', notificationRoutes)
app.route('/api', activityRoutes)
app.route('/api/admin', adminRoutes)

app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
