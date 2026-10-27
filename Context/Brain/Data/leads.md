---
type: data
status: aktif
updated: 2026-10-27
tables: [leads]
tags: [data]
---

# `leads` (model `Lead`)

Satu baris per tempat praktik/klinik (dari Google Maps atau input manual).

## Kolom penting
- **Data scrape** (ditimpa re-import): `google_place_id` (unik), `name`, `category`, `address`, `phone_raw`, `phone_normalized` (nomor yang bisa WA, E.164), `phone_office` (telepon kantor, hanya tampilan), `website`, `email`, `instagram_url`, `rating`, `review_count`, `open_hours`, `google_maps_url`, `lat`/`lng` (nullable untuk lead manual), `geom` (PostGIS, indeks GiST manual), `first/last_scraped_at`
- **Turunan:** `province`, `business_type`
- **Milik CRM** (lihat [[K-Kolom-CRM-Owned]]): `pipeline_stage` (FK [[pipeline_stage_defs]], default `new`), `notes`, `assigned_to`, `is_lost`, `lost_reason`, `custom_tags[]`, `label` + `label_note`, `trial_*`, `active_contact_node_id`

## Ditulis oleh
- `lib/upsertLeadsFromStaging.ts` (import scrape, raw SQL)
- `api/leads` POST (lead manual), `api/leads/[id]` PATCH/PUT
- `api/leads/[id]/label`
- `lib/waSend.ts` (`new`→`contacted` saat outbound pertama)
- wa-bridge `db-writer.ts` (`→ responded` saat inbound pertama)
- `apps/web/scripts/backfill-province-step*.mjs` (sekali jalan)

## Dibaca oleh
- Hampir semua halaman; `api/leads/route.ts` (filter search, stage, tag, lokasi, regions) dipakai dashboard, map, letters, dailylog

## Migrasi
init, lead_extra_fields, lead_province, lead_label, dashboard_and_templates (lat/lng nullable), contact_chain

## Backup JSON
✅ termasuk

← [[MOC-Model-Data]]
