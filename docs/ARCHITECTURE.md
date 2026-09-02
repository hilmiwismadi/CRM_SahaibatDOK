# Architecture

Internal lead-mapping + CRM tool for SahAIbat DOK sales. Full context and
rationale: `../../Context/SahaibatExplanation/1.SalesJobDesc.md`.

## Services

| Service | What it is | Why |
|---|---|---|
| `web` | Next.js (TypeScript, App Router) | Map UI, lead panel, pipeline editing, scrape-job admin. Stateless — all state in Postgres. |
| `wa-bridge` | Node.js + Baileys, own container | Owns the one persistent WhatsApp WebSocket + session files. Kept out of `web` so app rebuilds/restarts never drop the WA session or force re-pairing. Exposes an internal-only HTTP API (`/send`, `/status`, `/qr`) that `web` calls. |
| `db` | Postgres 16 + PostGIS | Canonical store for both `web` and `wa-bridge`. |
| `scraper` | gosom/google-maps-scraper, run on-demand via `docker run --rm` | Not an always-on service. Writes NDJSON to a file (`-json`); `web` imports that file into `stg_scrape_results`. (Originally planned to use gosom's `-dsn` Postgres flag directly — verified against the real `--help` output and a test run that `-dsn`/`-produce` is gosom's own internal job queue, not a way to land rows in a table we define, so we corrected to file + import instead. See `docs/SCRAPER_GUIDE.md`.) |
| `caddy` | Reverse proxy, `prod` Compose profile only | TLS + Basic Auth in front of `web` on a VPS. Not run locally. |

Only `web` is exposed publicly (directly on `:3000` locally, via Caddy `:443`
in prod). `db` and `wa-bridge`'s API stay on the internal Docker network
(`sahaibat-net`).

## Scraper → leads pipeline

1. Run `scripts/run-scrape.ps1` / `.sh` — writes NDJSON to
   `scrape-output/<name>.json` (one JSON object per result).
2. `POST /api/admin/import-staging` (from the `/admin/scrapes` page, or
   directly) creates a `scrape_jobs` row, parses the file, and inserts every
   row into `stg_scrape_results` tagged with that job.
3. The same request runs the upsert merge into `leads`, keyed on
   `google_place_id` (see `apps/web/src/lib/upsertLeadsFromStaging.ts`).
4. **The merge never touches CRM-owned columns** (`pipeline_stage`, `notes`,
   `assigned_to`, `is_lost`, `lost_reason`, `custom_tags`, trial fields) —
   only scrape-sourced columns are in the `DO UPDATE SET` clause.
   **Verified with a real re-scrape**: a lead manually moved to `contacted`
   with notes stayed exactly as edited after re-importing the same source
   file (which re-touched every other column).
5. `leads.phone_normalized` is computed at import time via
   `packages/shared/src/phone.ts`, ready for WhatsApp linking (Milestone 4).

Full flag reference, verified field mapping, and block-risk notes:
`docs/SCRAPER_GUIDE.md`.

## WhatsApp linking

`leads.phone_normalized` and `wa_contacts.phone_normalized` are both derived
via `packages/shared/src/phone.ts` (E.164, `+62` default) so scraped numbers
and WA JIDs (`62xxx@s.whatsapp.net`) match reliably. `wa_contacts.lead_id` is
nullable — a WA contact may not yet match a scraped lead.

On the first successful outbound message to a lead still in `pipeline_stage
= 'new'`, it auto-advances to `'contacted'` (logged as a `lead_activities`
row). One explicit rule, not a general automation engine.

## Data model

See `apps/web/prisma/schema.prisma` for the source of truth. Tables: `leads`,
`lead_activities`, `wa_contacts`, `wa_messages`, `scrape_jobs`,
`stg_scrape_results`, `pipeline_stage_defs`, `pipeline_transition_defs`.

## Pipeline stages

`leads.pipeline_stage` is a real foreign key into `pipeline_stage_defs`, not
a hardcoded enum — new stages get added by inserting a row (via a small data
migration) rather than a schema/code change. `pipeline_transition_defs`
defines which stage buttons are valid to show from a given stage, so the UI
asks "what can this lead move to next" instead of hardcoding the flow.

Current default flow (seeded in `apps/web/prisma/migrations/
20260902020000_pipeline_stages/migration.sql`, mirrored for reference in
`packages/shared/src/types.ts`):

```text
new → contacted → responded → meeting_aligned → client_deciding_trial
                                                        │
                                        ┌───────────────┴───────────────┐
                                        ▼                               ▼
                                 trial_rejected                  trial_accepted
                                  (terminal)                           │
                                                                        │ (25 days after
                                                                        │  trialStartedAt)
                                                                        ▼
                                                                 offer_payment
                                                                (next steps TBD —
                                                              add stages/transitions
                                                                 here when decided)
```

`is_lost` / `lost_reason` on `Lead` remain independent of `pipeline_stage` —
a lead can be marked dead from any stage without needing a dedicated "lost"
stage for every branch.

### Trial sub-state

While `pipeline_stage = 'trial_accepted'`, three additional columns track
the trial itself (not modeled as further pipeline stages, since they cycle
rather than progress):

- `trial_started_at` — set once, when the `client_deciding_trial →
  trial_accepted` transition happens.
- `trial_health_status` — one of `actively_using | need_checkup |
  not_actively_using` (see `TRIAL_HEALTH_STATUSES` in
  `packages/shared/src/types.ts`), meant to be updated roughly every
  `TRIAL_HEALTH_CHECK_INTERVAL_DAYS` (3) days by whoever's running the
  trial relationship.
- `trial_health_updated_at` — last time that happened; `now() -
  trial_health_updated_at > 3 days` is how the UI will flag a check-in as
  overdue.

**25-day auto-transition to `offer_payment`**: `TRIAL_OFFER_PAYMENT_AFTER_DAYS`
(25) days after `trial_started_at`, the lead should move to `offer_payment`
automatically. MVP implements this as a **read-triggered check** (evaluated
when a lead is fetched, not a background cron — there's no scheduler in the
stack yet) that performs the transition and logs a system `stage_change`
activity the first time it's noticed overdue, same pattern as the WA
"auto-tag Contacted" rule. Moving this to a proper daily job is a Phase 2
upgrade once the app has a real task runner (relevant for a VPS deploy).

## Local dev vs. VPS

Same `docker-compose.yml` in both places. Locally: `docker compose up db`
plus running `web`/`wa-bridge` directly on the host with `npm run dev:web` /
`npm run dev:wa-bridge` is the fastest inner loop; `docker compose up`
(building the production Dockerfiles) verifies full-stack parity before a
deploy. On a VPS: `docker compose -f docker-compose.yml -f
docker-compose.prod.yml up -d` adds the `caddy` profile. See
`docs/DEPLOY.md`.
