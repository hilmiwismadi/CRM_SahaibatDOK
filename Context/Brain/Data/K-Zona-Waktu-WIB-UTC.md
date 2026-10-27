---
type: concept
status: aktif
updated: 2026-10-27
code: [apps/web/src/lib/syncDateRange.ts]
tables: [wa_messages, sync_daily_summaries]
tags: [konsep, gotcha]
---

# Konsep: Zona Waktu (WIB vs UTC)

- **DB:** `wa_messages.sent_at` (dan timestamp Prisma lain) = `timestamp without time zone` yang **berisi UTC**.
- **Bisnis:** "hari" selalu hari kalender **WIB (UTC+7)**: `sync_daily_summaries.date`, kuota harian Send Guard, jam kirim 08–20 WIB, timesheet.
- **Helper:** `lib/syncDateRange.ts` (`wibDayRange`, `todayWib`), dipakai 3 route sync. Laporan dan `reports/followupParts.tsx` masih punya logika WIB inline.

## Query yang benar
```sql
-- tanggal WIB dari sent_at (UTC tanpa zona)
(sent_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date
```
❌ Jangan `sent_at::date` (salah di dekat tengah malam). Query lama di [[CRM Sync Pipeline]] §6 masih memakai cara ini; versi benar di [[12.TimesheetSync]] dan `scripts/crm-sync/timesheet-chats.sql`.

← [[MOC-Model-Data]]
