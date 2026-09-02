# SahAIbat DOK — Lead Mapping & CRM

Internal tool: scrape Google Maps for clinic/doctor leads, track them on a
map with a sales pipeline, and read/send WhatsApp from the lead panel.

Design rationale and full data model: `docs/ARCHITECTURE.md`.
Full local setup + troubleshooting: `docs/LOCAL_DEV.md`.

## Prerequisites

- Node.js 22+, npm
- Docker Desktop (for Postgres+PostGIS, and the on-demand scraper container)

## First-time setup

```bash
npm install --legacy-peer-deps   # workspace install (web, wa-bridge, shared)
cp .env.example .env             # adjust POSTGRES_PASSWORD etc.
cp .env apps/web/.env            # Prisma CLI reads apps/web/.env, not the root one
docker compose up -d db          # start Postgres+PostGIS (host port 5433, not 5432)
cd apps/web && npx prisma migrate dev && cd ../..   # run from a real terminal — needs a TTY
npm run db:generate              # generate Prisma client
```

Full walkthrough, gotchas, and troubleshooting: `docs/LOCAL_DEV.md`.

## Local dev (fast inner loop)

```bash
docker compose up -d db          # if not already running
npm run dev:web                  # http://localhost:3000
npm run dev:wa-bridge            # http://localhost:3001 (Milestone 4+)
```

## Full-stack in Docker (parity check before deploying)

```bash
docker compose up --build
```

## Running a scrape

```powershell
.\scripts\run-scrape.ps1 -QueriesFile .\scrape-queries\<name>.txt -Name <name>
```

Then import the result at `/admin/scrapes` (or `POST
/api/admin/import-staging`). Full guide: `docs/SCRAPER_GUIDE.md`.

## Deploying to a VPS

See `docs/DEPLOY.md` (Milestone 5).
