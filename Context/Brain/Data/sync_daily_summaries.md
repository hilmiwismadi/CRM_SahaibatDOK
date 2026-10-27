---
type: data
status: aktif
updated: 2026-10-27
tables: [sync_daily_summaries]
tags: [data]
---

# `sync_daily_summaries` (model `SyncDailySummary`)

Ringkasan chat per lead per hari ("Ringkasan Claude").

## Kolom penting
- `lead_id`, `date` (string `YYYY-MM-DD` **WIB**), `summary`; unik (lead, date)

## Ditulis oleh
- Sesi Claude Code → `scripts/crm-sync/summaries/<date>.json` → `build-summary-sql.mjs` → SQL `ON CONFLICT DO NOTHING` yang diterapkan user di VPS. **Tidak ada API tulis** (sengaja).

## Dibaca oleh
- `/sync/dailylog` (`api/sync/dailylog`)
- `/sync/timesheet`
- `api/reports/followup`

## Migrasi
sync_daily_summaries (2026-10-01)

## ⚠️ Perhatian
Tombol in-app "Ringkas dengan Claude" sudah dihapus dari kode (keputusan 2026-10-01).

## Backup JSON
❌ **tidak termasuk** `backup-json.ts` (hanya pg_dump)

SOP: [[9.DailySyncInput]].

← [[MOC-Model-Data]]
