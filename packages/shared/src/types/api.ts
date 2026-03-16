import type { User } from './user'
import type { UserRole } from './user'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthSignupRequest {
  email: string
  password: string
  display_name?: string
  invite_token?: string
}

export interface AuthLoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface CreateProjectRequest {
  title: string
  description?: string
}

export interface UpdateProjectRequest {
  title?: string
  description?: string
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export interface CreateInviteRequest {
  project_id: string
  email: string
}

export interface AcceptInviteRequest {
  token: string
}

// ─── File upload ──────────────────────────────────────────────────────────────

export interface PresignUploadRequest {
  project_id: string
  file_name: string
  mime_type: string
  file_size: number
}

export interface PresignUploadResponse {
  upload_url: string
  file_key: string
}

// ─── Tracks ───────────────────────────────────────────────────────────────────

export interface CreateTrackRequest {
  project_id: string
  name: string
  file_key: string
  file_size?: number
  mime_type?: string
  duration?: number
  parent_id?: string
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export interface CreateCommentRequest {
  body: string
  timestamp_seconds?: number
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface MarkNotificationsReadRequest {
  ids: string[]
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface ChangeRoleRequest {
  role: UserRole
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
}
