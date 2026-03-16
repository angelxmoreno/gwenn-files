import type {
  AuthSignupRequest,
  AuthLoginRequest,
  AuthResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateInviteRequest,
  PresignUploadRequest,
  PresignUploadResponse,
  CreateTrackRequest,
  CreateCommentRequest,
  MarkNotificationsReadRequest,
  ChangeRoleRequest,
  User,
  UserRole,
  Project,
  ProjectWithMembers,
  ProjectWithOwner,
  ProjectMember,
  Invite,
  InviteDetails,
  Track,
  TrackWithUploader,
  Comment,
  CommentWithUser,
  Notification,
  Activity,
  PaginatedResponse,
} from '@gwenn/shared'

const API_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? ''

function getToken(): string | null {
  return localStorage.getItem('gwenn_token')
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    let message = `API error ${res.status}`
    try {
      const body = (await res.json()) as { error?: string; message?: string }
      message = body.error ?? body.message ?? message
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export const auth = {
  signup: (data: AuthSignupRequest) =>
    apiFetch<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: AuthLoginRequest) =>
    apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    apiFetch<void>('/api/auth/logout', { method: 'POST' }),
}

// ─── Projects ──────────────────────────────────────────────────────────────────

export const projects = {
  list: () => apiFetch<ProjectWithOwner[]>('/api/projects'),

  create: (data: CreateProjectRequest) =>
    apiFetch<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (id: string) => apiFetch<ProjectWithMembers>(`/api/projects/${id}`),

  update: (id: string, data: UpdateProjectRequest) =>
    apiFetch<Project>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/projects/${id}`, { method: 'DELETE' }),

  getMembers: (id: string) =>
    apiFetch<Array<ProjectMember & { user: Pick<User, 'id' | 'display_name' | 'avatar_url'> }>>(`/api/projects/${id}/members`),

  removeMember: (id: string, userId: string) =>
    apiFetch<void>(`/api/projects/${id}/members/${userId}`, { method: 'DELETE' }),
}

// ─── Invites ───────────────────────────────────────────────────────────────────

export const invites = {
  create: (data: CreateInviteRequest) =>
    apiFetch<Invite>('/api/invites', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (token: string) => apiFetch<InviteDetails>(`/api/invites/${token}`),

  accept: (token: string) =>
    apiFetch<{ project_id: string }>(`/api/invites/${token}/accept`, {
      method: 'POST',
    }),
}

// ─── Uploads ───────────────────────────────────────────────────────────────────

export const uploads = {
  presign: (data: PresignUploadRequest) =>
    apiFetch<PresignUploadResponse>('/api/uploads/presign', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ─── Tracks ────────────────────────────────────────────────────────────────────

export const tracks = {
  list: (projectId: string) =>
    apiFetch<TrackWithUploader[]>(`/api/projects/${projectId}/tracks`),

  create: (data: CreateTrackRequest) =>
    apiFetch<Track>('/api/tracks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/tracks/${id}`, { method: 'DELETE' }),
}

// ─── Comments ──────────────────────────────────────────────────────────────────

export const comments = {
  list: (trackId: string) =>
    apiFetch<CommentWithUser[]>(`/api/tracks/${trackId}/comments`),

  create: (trackId: string, data: CreateCommentRequest) =>
    apiFetch<Comment>(`/api/tracks/${trackId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/comments/${id}`, { method: 'DELETE' }),
}

// ─── Notifications ─────────────────────────────────────────────────────────────

export const notifications = {
  list: (page = 1, limit = 20) =>
    apiFetch<PaginatedResponse<Notification>>(
      `/api/notifications?page=${page}&limit=${limit}`,
    ),

  markRead: (ids?: string[]) => {
    const body: MarkNotificationsReadRequest = { ids: ids ?? [] }
    return apiFetch<void>('/api/notifications/read', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
}

// ─── Activity ──────────────────────────────────────────────────────────────────

export const activity = {
  get: (projectId: string) =>
    apiFetch<Activity[]>(`/api/projects/${projectId}/activity`),
}

// ─── Admin ─────────────────────────────────────────────────────────────────────

export const admin = {
  getUsers: () => apiFetch<User[]>('/api/admin/users'),

  changeRole: (userId: string, role: UserRole) =>
    apiFetch<User>(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role } satisfies ChangeRoleRequest),
    }),
}
