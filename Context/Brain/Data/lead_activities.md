---
type: data
status: aktif
updated: 2026-10-27
tables: [lead_activities]
tags: [data]
---

# `lead_activities` (model `LeadActivity`)

Timeline per lead. Sumber laporan riwayat dan kanban harian.

## Kolom penting
- `lead_id`, `type` (string, lihat [[K-Tipe-Aktivitas]]), `payload` (Json), `created_at` (indeks lead+waktu desc)

## Ditulis oleh
- Banyak route + bridge, lihat [[K-Tipe-Aktivitas]]

## Dibaca oleh
- `api/reports/kanban-history`, `api/reports/activity-log`, `api/leads/[id]/activities` (timeline di map)

## Migrasi
init

## ⚠️ Perhatian
Rename `type` = laporan rusak diam-diam.

## Backup JSON
✅ termasuk

← [[MOC-Model-Data]]
