---
type: data
status: aktif
updated: 2026-10-27
tables: [scheduled_messages]
tags: [data]
---

# `scheduled_messages` (model `ScheduledMessage`)

Antrean Send Guard: pesan yang ditunda agar pola kirim terlihat manusiawi.

## Kolom penting
- `phone_normalized`, `lead_id` (tanpa FK), `body`, `scheduled_for`
- `status`: queued | sending | sent | failed | cancelled
- `reason`, `outreach`, `attempts`, `last_error`, `sent_message_id`, `sent_at`

## Ditulis oleh
- `lib/waSend.ts` `sendOrSchedule` (HTTP 202 bila ditunda)
- `lib/scheduledDispatcher.ts` (1 pesan per tick, `FOR UPDATE SKIP LOCKED`)
- `api/scheduled-messages/[id]` PATCH (reschedule/cancel/kirim sekarang)

## Dibaca oleh
- `/queue`, `api/scheduled-messages`

## Migrasi
scheduled_messages (2026-10-14)

## ⚠️ Perhatian
Dispatcher berjalan dari `instrumentation.ts` (nonaktif dengan `SCHEDULED_DISPATCHER_DISABLED`). Baris yang macet di `sending` ditandai failed.

## Backup JSON
❌ **tidak termasuk** `backup-json.ts` (hanya pg_dump)

Lihat [[K-Jalur-Kirim-WA]].

← [[MOC-Model-Data]]
