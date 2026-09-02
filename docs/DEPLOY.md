# VPS Deployment Guide

> Status: outline only — filled in during Milestone 5 (see plan). Local dev
> doesn't need this yet.

Planned contents:

1. Caddy reverse proxy + automatic TLS (`Caddyfile` → `web:3000`).
2. HTTP Basic Auth at the Caddy layer (single user for MVP).
3. `.env` handling on the VPS (never committed; restrictive file perms).
4. Postgres backup: named volume + cron'd `pg_dump`, retention policy.
5. WhatsApp session persistence: named volume for `wa-bridge` auth state
   must survive redeploys — **never** run `docker compose down -v` or prune
   that volume, it forces WhatsApp re-pairing and looks like anomalous login
   activity on the account.
6. Resource sizing: 2 vCPU / 4GB RAM VPS is plenty; run the `scraper`
   container as `--rm`, never resident.
7. Cutover steps: `docker compose -f docker-compose.yml -f
   docker-compose.prod.yml up -d --build`, `prisma migrate deploy` as part
   of `web`'s startup.
