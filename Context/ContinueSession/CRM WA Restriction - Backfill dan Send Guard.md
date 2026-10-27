# CRM WA Restriction — Backfill chat & Send Guard (resume file)

Dibuat 2026-10-14. Pendamping: `CRM Sync Pipeline.md`, `CRM Schedule and FU.md`, `CRM Map n Scrape.md`.
User: BD/Sales SahAIbat DOK, jawab Indonesia.

## Kejadian
WA user kena restriction (kirim banyak pesan mirip → dianggap spam bot). Sesi wa-bridge CRM terputus; `wa_messages` terakhir
tercatat **2026-10-13 07:25 UTC (14:25 WIB)** (VPS cek 10-14 07:24 UTC). Pesan setelahnya ada di HP/WA Web saja.
Volume terakhir: 10-12 → 413 pesan/62 kontak (115 keluar); 10-13 → 178 pesan/56 kontak (73 keluar).
Pesan dikirim dari HP tidak pernah tercatat (`inbound.ts` melewati `fromMe`) — backfill juga mengisi itu.

## 1. Backfill dari WA Web (SELESAI ditulis, BELUM dijalankan user)
Folder `scripts/wa-backfill/` — lihat `README.md` di sana. `wa-export.js` (paste di Console WA Web, 50 lead, cutoff 13 Okt 00:00 WIB)
→ file JSON → `import-wa-export.mjs` → SQL (default ROLLBACK, `-v apply=1` untuk COMMIT) → psql di VPS.
- ID pesan WA Web = ID Baileys → dedupe via `wa_message_id`; ada pengaman bila ID tidak cocok.
- Belum teruji pada DOM WA Web asli dan SQL belum dijalankan ke DB (eksekusi psql dari Claude ditolak classifier) → **dry run dulu**.

## 2. Send Guard + antrean terjadwal (kode SELESAI lokal, BELUM di-deploy)
Aturan (`apps/web/src/lib/sendGuard.ts`, konstanta `GUARD`): hanya "outreach" (penerima tidak membalas dalam 24 jam terakhir) yang dihitung;
jeda min 60–120 dtk; teks mirip (Jaccard ≥0.75) ke kontak lain → jeda 4–7 mnt; maks 5/10 mnt, 20/jam, 40/hari; jam kirim 08–20 WIB.
Melanggar → pesan masuk `scheduled_messages` (HTTP 202 dari POST messages) dan dikirim worker.
- Skema: model `ScheduledMessage`, migrasi `20261014120000_scheduled_messages` (additive; sha256 `6f8a8386…e637`).
- `lib/waSend.ts` → `sendOrSchedule()` (fail-open bila guard error; `force:true` = "Kirim sekarang").
- Worker: `lib/scheduledDispatcher.ts` + `src/instrumentation.ts` (tiap 20 dtk, 1 pesan/tick, klaim atomik, re-cek guard sebelum kirim,
  503 bridge offline → tunda 2 mnt tanpa hitung percobaan, "sending" macet >5 mnt → failed (tidak diulang, status terkirim tak pasti)).
  Matikan dengan env `SCHEDULED_DISPATCHER_DISABLED=1`.
- API: `GET /api/scheduled-messages`, `PATCH /api/scheduled-messages/[id]` (cancel|send_now|reschedule|retry). GET messages kini juga
  mengembalikan `scheduled[]` (aman bila tabel belum ada).
- UI: gelembung putus-putus + banner kuning di `/chat`, halaman baru `/queue` (belum ada item sidebar).
- Diuji: type-check bersih, eslint bersih, simulasi planner (12 pesan template sama → jarak ±5 mnt, balasan percakapan langsung, malam → 08:00 besok).
  Belum diuji di browser/DB.

### Urutan deploy (SOP lama: migrasi dulu, baru rebuild `web`)
1. Backup DB. 2. Terapkan migrasi via psql + insert `_prisma_migrations` (checksum di atas). 3. scp file yang berubah / rebuild `web` detached.
4. Cek `/chat`, `/queue`, `/api/scheduled-messages` = 200; `docker logs mapping-web-1 | grep scheduledDispatcher` ada "started".
File berubah: `prisma/schema.prisma` (CRLF!), migrasi baru, `lib/{sendGuard,scheduledDispatcher,scheduledQueue,waSend}.ts`, `src/instrumentation.ts`,
`api/{leads/[id],conversations/[id]}/messages/route.ts`, `api/scheduled-messages/**`, `chat/{page,MessageThread,types}`, `queue/page.tsx`.

## Terbuka
- wa-bridge harus pair ulang / nomor masih restricted? Selama bridge offline POST send = 503 (tidak masuk antrean).
- Angka GUARD adalah tebakan konservatif; sesuaikan setelah melihat pola nyata. Pesan dari HP belum dihitung guard (tidak tercatat) kecuali sudah di-backfill.
