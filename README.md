# gwenn-files

A professional music file sharing platform for artists, managers, producers, and contributors. Built as a Turborepo monorepo with a React frontend and Hono API on Cloudflare Workers.

## Architecture

```
/apps
  /web          → React + Vite frontend (deployed to Vercel)
  /api          → Hono on Cloudflare Workers (deployed to CF Workers)
/packages
  /db           → Supabase schema, RLS policies, generated types
  /shared       → Shared TypeScript types
```

**Key services:**
- **Auth & DB:** Supabase (email/password, magic link, Google OAuth, Postgres with RLS)
- **File storage:** Cloudflare R2 (browser uploads directly via presigned URLs)
- **Email:** SMTP via Cloudflare Worker secrets
- **Frontend hosting:** Vercel
- **API hosting:** Cloudflare Workers

---

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) ≥ 3 (for API dev/deploy)
- A [Supabase](https://supabase.com) project
- A Cloudflare account with [R2](https://developers.cloudflare.com/r2/) enabled
- An SMTP provider (e.g. Resend, Postmark, SendGrid)

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/angelxmoreno/gwenn-files.git
cd gwenn-files
bun install
```

### 2. Set up the database

Run the SQL in `packages/db/schema.sql` against your Supabase project (via the Supabase SQL editor or `psql`). This creates all tables, RLS policies, and trigger functions.

### 3. Configure environment variables

**Frontend (`apps/web`):**

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

```env
VITE_API_URL=http://localhost:8787
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**API (`apps/api`):**

Set Cloudflare Worker secrets locally using Wrangler:

```bash
cd apps/api
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put R2_ACCOUNT_ID
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put R2_BUCKET_NAME
wrangler secret put R2_PUBLIC_URL
wrangler secret put SMTP_HOST
wrangler secret put SMTP_PORT
wrangler secret put SMTP_USER
wrangler secret put SMTP_PASS
wrangler secret put SMTP_FROM
wrangler secret put JWT_SECRET
wrangler secret put APP_URL
```

Alternatively, create a `.dev.vars` file in `apps/api/` for local dev (this file is gitignored):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=gwenn-files
R2_PUBLIC_URL=https://pub-xxx.r2.dev
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@yourdomain.com
JWT_SECRET=your-random-secret
APP_URL=http://localhost:5173
```

### 4. Start all apps

```bash
bun run dev
```

This starts:
- **API** at `http://localhost:8787` (via `wrangler dev`)
- **Web** at `http://localhost:5173` (via Vite, proxies `/api` → `localhost:8787`)

Or run them individually:

```bash
cd apps/api && bun run dev
cd apps/web && bun run dev
```

---

## Common Commands

```bash
bun run dev          # start all apps in watch mode (Turborepo)
bun run build        # build all apps
bun run lint         # lint all packages
bun run typecheck    # type-check all packages
bun run format       # format with Prettier
```

---

## Deployment

### API — Cloudflare Workers

Make sure all secrets are set in your Cloudflare account (done once via `wrangler secret put` above, or via the Cloudflare dashboard).

Update `APP_URL` in `apps/api/wrangler.toml` to your production frontend URL:

```toml
[vars]
APP_URL = "https://your-app.vercel.app"
```

Deploy:

```bash
cd apps/api
bun run deploy        # runs: wrangler deploy
```

The worker name is `gwenn-api` (configured in `wrangler.toml`). After deploy, your API is live at `https://gwenn-api.<your-subdomain>.workers.dev`.

### Frontend — Vercel

1. Import the repo in the [Vercel dashboard](https://vercel.com/new).
2. Set **Root Directory** to `apps/web`.
3. Set the **Build Command** to `bun run build` and **Output Directory** to `dist`.
4. Add the following **Environment Variables** in Vercel:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | Your Cloudflare Worker URL (e.g. `https://gwenn-api.your-subdomain.workers.dev`) |
   | `VITE_SUPABASE_URL` | Your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

5. Deploy. Vercel auto-deploys on every push to `main`.

Alternatively, deploy from the CLI:

```bash
cd apps/web
bunx vercel --prod
```

---

## Roles & Permissions

| Role | Capabilities |
|---|---|
| **Admin** | Full access — all projects, user management, role promotion |
| **Manager** | Create projects, invite contributors, manage own projects |
| **Contributor** | Upload/download/comment in invited projects only |

- New users created via invite default to **Contributor**
- Only **Admin** can promote users to Admin or Manager

---

## Project Structure Details

### File Upload Flow
1. Browser requests a presigned PUT URL from `POST /api/uploads/presign`
2. Browser PUTs the file directly to R2 (never through the API)
3. Browser registers the track via `POST /api/tracks` with the returned `fileKey`
4. API inserts the track record and triggers email + in-app notifications

### Invite Flow
1. Manager/Admin sends an invite → token UUID generated, email sent via SMTP
2. Recipient clicks `/accept-invite?token=<uuid>`
3. Existing account → auto-join; new user → `/signup?token=<uuid>&email=<email>` → auto-join
4. Inviter notified; activity row inserted

### Audio Player
- Audio files (mp3, wav, flac, aiff, ogg): render a WaveSurfer.js waveform
- Non-audio files (zip, als, logic, flp, pdf, etc.): show file icon + download button
- Timestamp comments render as clickable markers on the waveform

---

## Environment Variable Reference

### Cloudflare Worker Secrets (`apps/api`)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin access) |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key ID |
| `R2_SECRET_ACCESS_KEY` | R2 secret access key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | Public base URL for R2 objects |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP server port (e.g. `465`) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | From address for outbound email |
| `JWT_SECRET` | Secret for signing JWTs |
| `APP_URL` | Frontend URL (used in email links) |

### Vercel Environment Variables (`apps/web`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | API base URL |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
