# Tone — Self-Hosted Music Streaming Server

Tone is a self-hosted music server (Spotify-style UX, Plex-style ownership) with a Node/Fastify + PostgreSQL/Prisma backend and React/Vite web app.

## Features
- Secure auth with httpOnly sessions, CSRF token checks, argon2 password hashing, login rate limits, login lockout, audit logs.
- Admin user/role management, disable/reset user flow.
- Music library ingest by folder scanning and web uploads.
- Metadata extraction via `music-metadata` (track, album, artists, genres, duration/codec/bitrate, cover extraction).
- Duplicate detection via file hash + duration.
- Full library pages: tracks/artists/albums/genres + metadata editing + bulk genre updates.
- Streaming API with secure access checks, HTTP range support, direct play detection, FFmpeg MP3 transcoding fallback.
- Cover art resize endpoint generated server-side.
- Playlists (public/private), add tracks, reorder with Prisma transaction.
- Search with typo tolerance via Postgres `pg_trgm` similarity across tracks/artists/albums/playlists/public users.
- Discover/recommendations: recently added, trending, and personalized genre/history-cooccurrence signal with explanations.
- Web app with global nav, search, library table, playlists/history/admin pages, persistent player bar, skip ±10s, queue basics, EQ (bass/treble via Web Audio API), volume, progress.
- Dockerized production + native run instructions for Ubuntu and Windows.

---

## Directory tree

```text
.
├── docker-compose.yml
├── package.json
├── server
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma
│   │   ├── migrations/202602050001_init/migration.sql
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src
│   │   ├── index.ts
│   │   ├── lib/prisma.ts
│   │   ├── plugins/auth.ts
│   │   ├── routes/{admin,auth,discover,library,playlists,search,stream,users}.ts
│   │   ├── services/{scanner,streaming}.ts
│   │   ├── types/fastify.d.ts
│   │   └── utils/{config,hash,path}.ts
│   └── test/integration.test.ts
├── shared
│   └── src/index.ts
└── web
    ├── .env.example
    ├── Dockerfile
    ├── package.json
    ├── src
    │   ├── App.tsx
    │   ├── api/client.ts
    │   ├── components/PlayerBar.tsx
    │   ├── pages/*.tsx
    │   ├── store/player.ts
    │   └── styles/app.css
    └── vite.config.ts
```

## Quick Start (Docker, production-like)

### 1) Prerequisites
- Docker Desktop (Windows/macOS) or Docker Engine + Compose plugin (Linux)
- FFmpeg is already in server container via image dependencies path configured as `ffmpeg`

### 2) Start
```bash
docker compose up --build
```

- API: `http://localhost:4000/api/health`
- Web: `http://localhost:5173`

### 3) Create first admin
The seed script runs automatically in container startup.
Default admin:
- Email: `admin@local`
- Password: `admin123!`

Override by setting in environment:
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_NAME`

---

## Native Run (Ubuntu/Linux)


### Prisma migrate note (Windows compatibility)
If you run Prisma commands without `server/.env`, scripts now auto-load `server/.env.example` as a fallback so `DATABASE_URL` is present. For real deployments, create `server/.env` and set your own DB URL.

If you hit `P1012` mentioning datasource `extensions`, update to this repo version (schema no longer uses datasource `extensions`) and run:
```bash
npm run -w server prisma:migrate
```

```bash
# from repo root
npm install
cp server/.env.example server/.env
cp web/.env.example web/.env

# ensure PostgreSQL is running and DATABASE_URL is valid
npm run -w server prisma:generate
npm run -w server prisma:migrate
npm run -w server seed

# run backend + frontend in separate shells
npm run -w server dev
npm run -w web dev
```

### Install FFmpeg (Ubuntu)
```bash
sudo apt update
sudo apt install -y ffmpeg
ffmpeg -version
```

---

## Native Run (Windows)

1. Install:
- Node.js 22+
- PostgreSQL 16+
- FFmpeg (add to PATH)

2. In PowerShell:
```powershell
npm install
Copy-Item server/.env.example server/.env
Copy-Item web/.env.example web/.env
npm run -w server prisma:generate
npm run -w server prisma:migrate
npm run -w server seed
```

3. Start apps (2 shells):
```powershell
npm run -w server dev
npm run -w web dev
```

### Install FFmpeg (Windows)
- Download FFmpeg build from official project.
- Add `ffmpeg.exe` folder to `PATH`.
- Validate: `ffmpeg -version`.

---

## Admin setup: add library path and scan
1. Login as admin.
2. Add library path via API/UI (`POST /api/library/paths`).
3. Trigger scan (`POST /api/library/scan`).
4. Poll status (`GET /api/library/scan/:id`).

Example API calls:
```bash
curl -X POST http://localhost:4000/api/library/paths \
  -H 'Content-Type: application/json' \
  -H 'x-csrf-token: <token>' \
  -d '{"path":"/app/media/library"}'

curl -X POST http://localhost:4000/api/library/scan \
  -H 'x-csrf-token: <token>'
```

---

## Security notes
- Auth cookies are `httpOnly`, `sameSite=lax`, secure in production.
- CSRF check for mutating endpoints via double-submit token.
- Passwords hashed with argon2.
- Request validation via Zod.
- Uploads sanitize filenames and enforce audio-only extensions.
- Range-stream endpoint checks auth and existence.
- Audit logging for login and admin actions.

---

## Acceptance test matrix
Automated tests are included in `server/test/integration.test.ts`.

Manual verification steps:
1. **Create admin, create user, login, persistent session**
   - Login as seeded admin.
   - Create a user in Admin page (`/admin`).
   - Login as user and refresh browser (session persists).
2. **Upload a track appears with metadata**
   - Upload in Library.
   - Trigger scan.
   - Confirm title/artist/album/duration displayed in Tracks table.
3. **Typos fuzzy search**
   - Search `metllica` and confirm `Metallica` track/artist appears.
4. **Range streaming seek**
   - Start playback, drag seek bar; confirm `206 Partial Content` in devtools network.
5. **Playlist create/add/reorder/play**
   - Create playlist, add tracks, reorder via reorder endpoint, play from playlist page.
6. **Recommendations populate after history**
   - Play tracks for a few minutes.
   - Open Home discover and verify “For You” cards include “Because you listened to …”.

---

## Environment variables
See `server/.env.example` and `web/.env.example` for complete configurable values (library paths, ffmpeg path, upload and registration toggles, CORS, DB URL, secrets).
