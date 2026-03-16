# CLAUDE.md

This file provides guidance for Claude when working on the gwenn-files music sharing platform.

## Project Overview

A professional music file sharing platform for artists, managers, producers, and contributors. Built as a Turborepo monorepo with a React frontend and Hono API on Cloudflare Workers.

## Monorepo Structure

```
/apps
  /web          → React + Vite frontend (deployed to Vercel)
  /api          → Hono on Cloudflare Workers (deployed to CF Workers)
/packages
  /db           → Supabase types, schema, RLS policies
  /shared       → Shared TypeScript types
```

## Tech Stack

### Frontend (`apps/web`)
- React + Vite + TypeScript
- Tailwind CSS v4 + DaisyUI v5
- TanStack Router (file-based routing)
- TanStack Query (server state)
- Zustand (global/client state)
- WaveSurfer.js (audio waveform + timestamp comment markers)
- Dark mode default, mobile-first

### Backend (`apps/api`)
- Hono on Cloudflare Workers
- Supabase Auth (email+password, magic link, Google OAuth)
- Supabase Postgres with Row Level Security (RLS)
- Cloudflare R2 for file storage (presigned URLs — browser uploads directly to R2)
- SMTP email via Cloudflare Worker secrets

### Tooling
- Turborepo + Bun
- ESLint + Prettier

## Common Commands

```bash
bun install               # install dependencies
bun run dev               # start all apps in dev mode (turborepo)
bun run build             # build all apps
bun run lint              # lint all packages
bun run format            # format with prettier

# Per-app
cd apps/web && bun run dev
cd apps/api && bun run dev
```

## Roles & Permissions

| Role        | Key capabilities |
|-------------|-----------------|
| Admin       | Full access — all projects, user management, role promotion |
| Manager     | Create projects, invite contributors, manage own projects |
| Contributor | Upload/download/comment in invited projects only |

- New users created via invite default to **Contributor**
- Only **Admin** can create or promote users to Admin or Manager

## Key Architectural Patterns

### File Upload Flow
1. Browser requests presigned PUT URL from `POST /api/uploads/presign`
2. Browser PUTs file directly to R2 (never through the API)
3. Browser registers track via `POST /api/tracks` with the `fileKey`
4. API inserts track, triggers email + in-app notifications, inserts activity row

### Invite Flow
1. Manager/Admin sends invite → token UUID generated, email sent via SMTP
2. Recipient clicks `/accept-invite?token=<uuid>`
3. Existing account → auto-join; no account → `/signup?token=<uuid>&email=<email>` → auto-join
4. Inviter notified; activity row inserted

### Audio Player
- Audio files (mp3, wav, flac, aiff, ogg): render WaveSurfer.js waveform
- Non-audio files (zip, als, logic, flp, pdf, etc.): show file icon + download button
- Timestamp comments render as clickable markers on the waveform
- Leaving a comment while playing auto-captures current timestamp

## Database Tables

`users`, `projects`, `project_members`, `invites`, `tracks`, `comments`, `notifications`, `activity`

- `tracks.parent_id` → self-referential FK for versioning (full history preserved, no deletions)
- `comments.timestamp_seconds` → null = general comment, value = waveform marker
- `notifications.payload` → JSONB for flexible metadata

## API Endpoints

All routes under `/api/`. Key groupings:
- `/api/auth/*` — signup, login, logout
- `/api/projects/*` — CRUD, members
- `/api/invites/*` — send, get details, accept
- `/api/uploads/presign` — R2 presigned URL
- `/api/tracks/*` — list, register, delete
- `/api/tracks/:id/comments` — list, add
- `/api/notifications` — list, mark read
- `/api/projects/:id/activity` — activity feed
- `/api/admin/users` — admin-only user management

## Environment Variables

### Cloudflare Worker Secrets
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `JWT_SECRET`, `APP_URL`

### Vercel (Frontend)
`VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Frontend Routes

```
/                         → Landing / login redirect
/login                    → Login
/signup                   → Sign up
/accept-invite            → Accept invite (?token=)
/dashboard                → Project list
/projects/new             → Create project (manager/admin)
/projects/:id             → Project detail
/projects/:id/upload      → Upload files
/projects/:id/settings    → Project settings (manager/admin)
/admin                    → Admin panel
/admin/users              → User management
```

## Out of Scope (MVP)

- User profile pages
- Real-time collaboration (WebSockets)
- In-app messaging / DMs
- Payment / subscription tiers
- Public shareable links
- Storage quota per user
