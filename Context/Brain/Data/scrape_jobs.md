---
type: data
status: aktif
updated: 2026-10-27
tables: [scrape_jobs]
tags: [data]
---

# `scrape_jobs` (model `ScrapeJob + StgScrapeResult`)

Riwayat job scrape + tabel staging mentah `stg_scrape_results`.

## Kolom penting
- `scrape_jobs`: `query_text`, `geo_params`, `status` (running | completed | failed | imported), `raw/new/updated_lead_count`
- `stg_scrape_results`: kolom hasil gosom + `raw_json`; `imported_at` null sampai di-merge

## Ditulis oleh
- `api/admin/import-staging` (membaca `scrape-output/*.json` yang di-mount ke container) → `lib/gosomEntry.ts`
- `api/scrape-jobs`

## Dibaca oleh
- `lib/upsertLeadsFromStaging.ts` → [[leads]]
- `/admin/scrapes`

## Migrasi
init

## ⚠️ Perhatian
`import-staging` **tanpa autentikasi** (dipanggil via curl di VPS). Respons `mergeSummary`: scanned/new/updated/skipped/excluded.

## Backup JSON
❌ **tidak termasuk** `backup-json.ts` (hanya pg_dump)

← [[MOC-Model-Data]]
