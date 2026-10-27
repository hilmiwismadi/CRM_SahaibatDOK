---
type: data
status: aktif
updated: 2026-10-27
tables: [wa_messages]
tags: [data]
---

# `wa_messages` (model `WaMessage`)

Pesan WA masuk/keluar.

## Kolom penting
- `wa_contact_id`, `wa_message_id` (unik = id Baileys, dedupe), `direction` (inbound | outbound), `body`, `message_type`, `raw_payload`, `sent_at`

## Ditulis oleh
- wa-bridge `inbound.ts` (inbound; **`fromMe` di-skip** → pesan dari HP tidak tercatat)
- `lib/waSend.ts` (outbound dari app)
- `scripts/wa-backfill/` (SQL backfill, `ON CONFLICT (wa_message_id)`)

## Dibaca oleh
- `/chat`, `noReplyAfterPitch.ts`, `nonResponsive.ts`, `api/sync/timesheet`, `kanban-history`, `api/reports/*` (raw SQL)

## Migrasi
init

## ⚠️ Perhatian
`sent_at` = timestamp **tanpa zona berisi UTC** → [[K-Zona-Waktu-WIB-UTC]]. Gap data: 2026-10-13 14:25 WIB s/d backfill (lihat [[03-Changelog]]).

## Backup JSON
✅ termasuk

← [[MOC-Model-Data]]
