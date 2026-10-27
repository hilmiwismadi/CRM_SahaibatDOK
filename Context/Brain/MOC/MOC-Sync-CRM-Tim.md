---
type: moc
status: aktif
updated: 2026-10-27
---

# Sync ke CRM Tim (sales.sahaibat.com)

Sync **satu arah, manual**: Mapping → CRM tim (Vercel, DB terpisah, hanya lewat API dengan sesi browser). Script console di-paste ke DevTools.

## Note Brain
- [[K-Kosakata-Stage]]
- [[sync_daily_summaries]]
- [[K-Zona-Waktu-WIB-UTC]]
- Fase 3: [[F-Sync-Leadinput-Dailylog]], [[F-Sync-Timesheet]]
- Fase 4: [[S-CRM-Tim]], [[SOP-Ringkasan-Harian]], [[SOP-Timesheet-Mingguan]]

## Doc sumber
- [[CRM Sync Pipeline]]: **SOP aktif** (`/sync/leadinput`, `/sync/dailylog`, mapping stage)
- [[0.CRMSahaibatUnderstanding]]: peta UI/API CRM tim
- [[9.DailySyncInput]]: cara mengisi Ringkasan Claude
- [[12.TimesheetSync]]: timesheet mingguan
- [[2.LeadPipelineScripts]]: SOP lama (CSV, konflik)

## Jalur Ringkasan Claude (berlaku)
Sesi Claude Code membaca chat (`scripts/crm-sync/dailylog-chats.sql`) → menulis `scripts/crm-sync/summaries/<date>.json` → `build-summary-sql.mjs <date>` → `<date>.sql` (`ON CONFLICT DO NOTHING`) → user menerapkannya di VPS → muncul di `/sync/dailylog` dan `/sync/timesheet`. Tombol in-app berbayar **sudah dihapus** (keputusan 2026-10-01).
