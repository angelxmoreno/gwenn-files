# Music File Sharing App — Full Project Specification

## Project Overview

A professional music file sharing platform that allows an artist (manager) to upload music files, collaborate with producers and contributors, share projects, and manage access. Built as a monorepo with a React frontend and Hono API on Cloudflare Workers.

-----

## Tech Stack

### Frontend

- **Framework:** React + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + DaisyUI v5
- **Router:** TanStack Router
- **Server State:** TanStack Query
- **Global State:** Zustand
- **Audio Player:** WaveSurfer.js (waveform + timestamp comment markers)
- **Dark Mode:** Yes — supported from day one
- **Responsive:** Mobile-first

### Backend

- **API:** Hono on Cloudflare Workers
- **Auth:** Supabase Auth (email+password, magic link, Google OAuth — more social providers added later)
- **Database:** Supabase Postgres with Row Level Security (RLS)
- **File Storage:** Cloudflare R2 (presigned URLs for direct browser uploads)
- **Email:** SMTP (user-provided credentials, stored as Cloudflare Worker secrets)

### Monorepo

- **Tool:** Turborepo
- **Package Manager / Runtime:** Bun
- **Code Quality:** ESLint + Prettier
- **Structure:**
  
  ```
  /apps
    /web          → React + Vite frontend
    /api          → Hono on Cloudflare Workers
  /packages
    /db           → Supabase types, schema, RLS policies
    /shared       → Shared TypeScript types
  ```

### Deployment

- **Frontend:** Vercel
- **API:** Cloudflare Workers
- **Storage:** Cloudflare R2
- **Database:** Supabase
- **Custom domain:** Yes — configured from day one
- **PHP server (Serverbyt):** Parked, not used in this project

-----

## Roles & Permissions

There are four roles. Every new user created via invite starts as a **Contributor** by default. Admins can change any user’s role at any time.

|Permission                      |Admin|Manager              |Contributor         |
|--------------------------------|-----|---------------------|--------------------|
|See all projects                |✅    |❌ (own only)         |❌ (invited only)    |
|Create projects                 |✅    |✅                    |❌                   |
|Invite users to projects        |✅    |✅ (own projects only)|❌                   |
|Upload files                    |✅    |✅                    |✅ (invited projects)|
|Download files                  |✅    |✅                    |✅ (invited projects)|
|Delete files                    |✅    |✅ (own projects)     |❌                   |
|Leave comments                  |✅    |✅                    |✅                   |
|Remove contributors from project|✅    |✅ (own projects)     |❌                   |
|Promote/demote user roles       |✅    |❌                    |❌                   |
|Create Admin/Manager accounts   |✅    |❌                    |❌                   |

### Role assignment rules

- New user signs up via invite → **Contributor** by default
- **Admin** is the only role that can create or promote users to Admin or Manager
- **Managers** can invite Contributors to their own projects
- **Managers** can remove Contributors from their own projects

-----

## Database Schema

```sql
-- Users (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'contributor' CHECK (role IN ('admin', 'manager', 'contributor')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Members (accepted invites)
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'contributor' CHECK (permission IN ('owner', 'contributor')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Invites
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES public.users(id),
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracks
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.users(id),
  name TEXT NOT NULL,
  file_key TEXT NOT NULL,       -- R2 object key
  file_size BIGINT,
  mime_type TEXT,
  duration_seconds FLOAT,
  version INT NOT NULL DEFAULT 1,
  parent_id UUID REFERENCES public.tracks(id),   -- previous version
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  body TEXT NOT NULL,
  timestamp_seconds FLOAT,      -- nullable: null = general comment, value = timestamp marker
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'file_uploaded', 'invite_accepted', 'comment_added',
    'added_to_project', 'new_version_uploaded'
  )),
  payload JSONB,                -- flexible metadata (project name, track name, actor, etc.)
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Feed
CREATE TABLE public.activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.users(id),
  type TEXT NOT NULL,           -- 'uploaded', 'commented', 'invited', 'joined', 'new_version'
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

-----

## Row Level Security (RLS)

```sql
-- Users can see other users in projects they share
CREATE POLICY "users_visible_to_project_members" ON public.users
  FOR SELECT USING (
    id IN (
      SELECT user_id FROM public.project_members
      WHERE project_id IN (
        SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
      )
    )
    OR id = auth.uid()
  );

-- Projects: only members can see
CREATE POLICY "project_members_only" ON public.projects
  FOR SELECT USING (
    id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Tracks: only accessible within your projects
CREATE POLICY "track_access" ON public.tracks
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Comments: same as tracks
CREATE POLICY "comment_access" ON public.comments
  FOR SELECT USING (
    track_id IN (
      SELECT t.id FROM public.tracks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Notifications: own only
CREATE POLICY "own_notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
```

-----

## Auth Flow

### Sign Up (via invite)

1. Invited user receives email with signed link: `/accept-invite?token=<uuid>`
1. If they already have an account → auto-joined to project, token marked accepted
1. If no account → sign up form with email pre-filled → account created as **Contributor** → auto-joined

### Sign In Methods

- Email + password
- Magic link (email)
- Google OAuth
- (More social providers to be added later)

-----

## File Upload Flow

```
Browser selects file
      ↓
POST /api/uploads/presign  { projectId, fileName, mimeType, fileSize }
      ↓
Hono Worker validates user is a project member
      ↓
Returns: { uploadUrl (R2 presigned PUT), fileKey }
      ↓
Browser PUTs file directly to R2 (never touches the API server)
      ↓
POST /api/tracks  { projectId, name, fileKey, fileSize, mimeType, duration, parentId? }
      ↓
Insert track record → Supabase
      ↓
Trigger notifications → SMTP email + in-app notification row
      ↓
Insert activity row
```

- **Max file size:** No enforced limit (within R2 free tier — 10GB total)
- **Accepted formats:** Any file type
- **Versioning:** New upload can be marked as a new version of an existing track (`parentId` set). Full history preserved — no files deleted.

-----

## Invite Flow

```
Manager/Admin opens project → Invite tab → enters email
      ↓
POST /api/invites  { projectId, email }
      ↓
Insert invite row with UUID token
      ↓
Send email via SMTP: "You've been invited to [Project Name]"
Link: https://<domain>/accept-invite?token=<uuid>
      ↓
Recipient clicks link
      ↓
Has account? → auto-join → redirect to project
No account? → /signup?token=<uuid>&email=<email> → create account → auto-join
      ↓
Invite marked accepted_at = NOW()
      ↓
Notify inviter: "Producer X accepted your invite"
Insert activity row
```

-----

## Notification Events

Both email (SMTP) and in-app notifications are created for:

|Event                       |Who gets notified                  |
|----------------------------|-----------------------------------|
|New file uploaded to project|All project members except uploader|
|Someone accepted your invite|The person who sent the invite     |
|Someone left a comment      |Track uploader + project owner     |
|You were added to a project |The invited user (on accept)       |
|A new version was uploaded  |All project members except uploader|

In-app notifications are stored in the `notifications` table. Unread count shown in nav. Mark as read on open.

-----

## Audio Player (WaveSurfer.js)

- Render audio waveform for all audio file types (mp3, wav, flac, aiff, ogg)
- Non-audio files (zip, als, logic, flp, pdf, etc.) show a file icon + download button instead
- Clicking the waveform seeks to that position
- Timestamp comments rendered as clickable markers on the waveform
- Clicking a marker jumps to that timestamp and highlights the comment
- Leaving a comment while audio is playing captures the current timestamp automatically

-----

## Pages & Routes

```
/                         → Landing / login redirect
/login                    → Login (email+password, magic link, Google)
/signup                   → Sign up
/accept-invite            → Accept invite (with ?token=)
/dashboard                → Home — project list
/projects/new             → Create project (manager/admin only)
/projects/:id             → Project detail (tracks, members, activity)
/projects/:id/upload      → Upload files
/projects/:id/settings    → Project settings (manager/admin)
/admin                    → Admin panel (admin only)
/admin/users              → User management — roles, list, promote/demote
```

-----

## API Endpoints (Hono on Cloudflare Workers)

```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/projects              → list my projects
POST   /api/projects              → create project (manager/admin)
GET    /api/projects/:id          → project detail
PATCH  /api/projects/:id          → update project (manager/admin)
DELETE /api/projects/:id          → delete project (admin only)

GET    /api/projects/:id/members  → list members
DELETE /api/projects/:id/members/:userId  → remove member

POST   /api/invites               → send invite
GET    /api/invites/:token        → get invite details (public)
POST   /api/invites/:token/accept → accept invite

POST   /api/uploads/presign       → get R2 presigned PUT URL
GET    /api/projects/:id/tracks   → list tracks
POST   /api/tracks                → register track after upload
DELETE /api/tracks/:id            → delete track (manager/admin)

GET    /api/tracks/:id/comments   → list comments
POST   /api/tracks/:id/comments   → add comment (with optional timestamp)
DELETE /api/comments/:id          → delete own comment

GET    /api/notifications         → my notifications (paginated)
POST   /api/notifications/read    → mark as read

GET    /api/projects/:id/activity → activity feed

GET    /api/admin/users           → all users (admin only)
PATCH  /api/admin/users/:id/role  → change role (admin only)
```

-----

## Environment Variables

### Cloudflare Worker Secrets

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
JWT_SECRET
APP_URL
```

### Vercel (Frontend)

```
VITE_API_URL
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

-----

## Design System

- **Theme:** Dark mode default, light mode toggle available
- **Priority:** Mobile-first, fully responsive
- **Component library:** DaisyUI v5 on Tailwind v4
- **Audio-forward UI:** Waveform players are prominent, not afterthoughts
- **Color palette:** To be defined — suggest dark background with accent color fitting music/creative industry (e.g. deep purple or teal)

-----

## Out of Scope (for MVP)

- User profile pages
- Real-time collaboration (WebSockets)
- In-app messaging / DMs
- Payment / subscription tiers
- Public shareable links (no-account access)
- Storage quota per user
- PHP server on Serverbyt (parked)
