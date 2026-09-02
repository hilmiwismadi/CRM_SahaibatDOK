# Running Locally

Step-by-step guide to get the full stack running on your own machine
(verified on Windows with Docker Desktop). For the "why" behind the
architecture, see `ARCHITECTURE.md`. For a VPS, see `DEPLOY.md`.

## Prerequisites

- **Node.js 22+** and npm
- **Docker Desktop**, running (check the whale icon in your system tray, or
  `docker info` should not error)

## 1. First-time setup

From the repo root (`Mapping/`):

```bash
npm install --legacy-peer-deps
```

`--legacy-peer-deps` works around an npm arborist bug we hit with this
dependency tree (Next.js 16 + Prisma + Leaflet) — without it, `npm install`
can crash with `Cannot read properties of null (reading 'edgesOut')`.

```bash
cp .env.example .env
```

Open `.env` and set a real `POSTGRES_PASSWORD` (anything works for local
dev). Leave the rest as-is unless you changed a port.

> **Port 5433, not 5432.** The `db` container publishes Postgres on host
> port **5433**. If your machine already has a native PostgreSQL install
> (common — check with `docker compose up -d db` then `docker compose ps`;
> if `db` won't bind 5432 or Prisma gets an auth error against the wrong
> server, that's this), 5433 sidesteps the clash entirely. `.env.example`
> already reflects this.

```bash
docker compose up -d db
```

Wait for it to report healthy:

```bash
docker compose ps
# mapping-db-1   ...   Up X seconds (healthy)   0.0.0.0:5433->5432/tcp
```

Apply the database schema. `apps/web` also needs its own `.env` for Prisma
CLI to find `DATABASE_URL` (Prisma only reads `.env` next to
`prisma/schema.prisma`, not the repo-root one):

```bash
cp .env apps/web/.env
cd apps/web
npx prisma migrate dev   # interactive — run this from a real terminal, not a script
cd ../..
```

`prisma migrate dev` requires an interactive TTY (it prompts before
destructive changes). If you ever need to apply existing migrations
non-interactively (CI, a fresh clone with no schema changes), use
`npx prisma migrate deploy` instead — see `apps/web/prisma/migrations/` for
what's already there.

```bash
npm run db:generate
```

## 2. Day-to-day dev (fast inner loop)

Keep `db` running in Docker, run the apps directly on the host — this is
much faster than rebuilding containers on every change.

```bash
docker compose up -d db          # if not already running
npm run dev:web                  # http://localhost:3000
npm run dev:wa-bridge             # http://localhost:3001 (real WhatsApp wiring lands in Milestone 4)
```

Run each in its own terminal (or background them). Both hot-reload on file
changes.

**Verifying it's up**: if you're testing from a script/agent rather than a
browser, prefer PowerShell's `Invoke-WebRequest` over Git-Bash's `curl` on
Windows — we saw Git-Bash's bundled curl reset connections to `localhost`
that PowerShell (and a real browser) handled fine. Not a bug in the app,
just a Git-Bash quirk on this platform.

```powershell
Invoke-WebRequest http://localhost:3000 -UseBasicParsing
```

## 3. Full-stack parity check (before deploying)

Runs everything — `db`, `web`, `wa-bridge` — from the same Dockerfiles used
in production, on the same `docker-compose.yml` that a VPS deploy uses:

```bash
docker compose up --build
```

`web` → http://localhost:3000. `wa-bridge` is intentionally **not**
published to the host in this mode (only reachable from `web` over the
internal `sahaibat-net` network) — that's by design, see `ARCHITECTURE.md`.
To sanity-check it's reachable internally:

```bash
docker compose exec web node -e "fetch('http://wa-bridge:3001/status').then(r=>r.text()).then(console.log)"
```

## 4. Stopping / resetting

```bash
docker compose stop            # stop containers, keep data
docker compose stop web wa-bridge   # keep db running, stop the rest (typical when going back to host-based dev)
docker compose down            # stop + remove containers (volumes survive)
```

**Never** run `docker compose down -v` once `wa-bridge` actually holds a
paired WhatsApp session (Milestone 4+) — it wipes the session volume and
forces re-scanning the QR code, which can look like anomalous login
activity on the WhatsApp account.

To wipe the database and start over:

```bash
docker compose down -v   # only db has meaningful data before Milestone 4
docker compose up -d db
cd apps/web && npx prisma migrate deploy && cd ../..
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `npm install` crashes with `Cannot read properties of null (reading 'edgesOut')` | Known npm arborist bug with this dependency tree | Use `npm install --legacy-peer-deps` |
| Prisma `P1000: Authentication failed` against `localhost` | Hit a native Postgres install on port 5432 instead of the container | Confirm you're using port **5433** in `DATABASE_URL` (see `.env.example`) |
| Prisma `Environment variable not found: DATABASE_URL` when running `npx prisma` commands in `apps/web` | Prisma CLI reads `.env` next to `schema.prisma`, not the repo-root `.env` | `cp .env apps/web/.env` |
| `prisma migrate dev` errors with "non-interactive environment... not supported" | It refuses to run without a TTY (CI, scripts, some agent shells) | Run it from a real interactive terminal, or use `prisma migrate deploy` to apply migrations that already exist on disk |
| `docker compose up -d db` fails with a pipe/engine connection error | Docker Desktop isn't running yet | Start Docker Desktop, wait for the whale icon to settle, retry |
| `next build` in Docker fails with `Could not find the Next.js package (next/package.json)` | Turbopack's monorepo root auto-detection needs the lockfile in the build stage, which multi-stage Docker builds don't always carry forward | Already fixed here via explicit `turbopack.root` in `apps/web/next.config.ts` — if you see this again after editing the Dockerfile, make sure the root `package.json`/`package-lock.json` are still copied into the `build` stage |
| Docker build first run is very slow, huge context transfer (tens of MB) | No `.dockerignore` | Already added at repo root — excludes `node_modules`, `.next`, `dist`, `.git` |
| `curl http://localhost:3000` from Git-Bash hangs or resets, but the app is actually running | Git-Bash's bundled curl has a loopback quirk on Windows | Use a browser, or PowerShell's `Invoke-WebRequest` |
