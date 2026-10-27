---
type: moc
status: aktif
updated: 2026-10-27
---

# Deploy & Operasional VPS

Satu VPS, Docker Compose di `~/Mapping`: `db` (postgis 16, 127.0.0.1:5433), `web` (:3000), `wa-bridge` (internal :3001), `caddy` (profile prod). Kredensial ada di `VPS_DW/` (jangan disalin ke sini).

## Note Brain
- [[02-Rules-for-Claude]]
- [[K-Riwayat-Migrasi]]
- [[03-Changelog]]
- Fase 4: [[S-VPS]], [[S-Docker-Stack]], [[SOP-Deploy-Web]], [[SOP-Migrasi-Manual]]

## Doc sumber
- [[10.VpsAccessAndDeploy]]: **kanonik** (akses, izin, urutan deploy, import)
- [[DEPLOY]]: usang (menyebut Caddy TLS + `migrate deploy`)
- [[7.RecurringTurbopackCrash]]: crash dev lokal
- [[CRM Map n Scrape]] §3, [[CRM Sync Pipeline]] §5: duplikat langkah deploy

## Skrip deploy yang ada
- `scripts/deploy-important-2026-10-21*.sh`, `deploy-demo-backfill-2026-10-21.sh`, `sendguard-deploy.sh` (dijalankan di VPS)
- `scripts/check-deploy-diff.sh`: **baca-saja**, membandingkan lokal vs VPS (dibuat 2026-10-27)
