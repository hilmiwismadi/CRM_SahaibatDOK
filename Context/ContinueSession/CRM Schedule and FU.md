# CRM Schedule and FU — Resume File (ringkas, hanya konteks terbaru)

Terakhir diperbarui 2026-10-07. Versi lengkap sebelumnya diarsipkan di `CRM Schedule and FU - arsip lengkap 2026-10-01.md` (analisis pitch, page→API map, catatan sales.sahaibat.com, dll) — baca hanya bila perlu.
User: BD/Sales SahAIbat DOK; Claude berperan sebagai sales strategist (memory `user_role_sahaibat`). User menulis Indonesia — jawab Indonesia.

## 1. Setup singkat (Mapping CRM)
- Prod: `http://103.93.162.31:3000`. VPS `103.93.162.31`, user `DzakiWismadi`, key `VPS_DW/DWSSH.pem`, proyek di `~/Mapping`. Container: `mapping-web-1`, `mapping-db-1`, `mapping-wa-bridge-1` (jangan sentuh `jacked-*`, volume `wa-session`, atau `docker compose down -v`).
- Sumber kebenaran = VPS; lokal `D:\Hilmi\Coding\Sahaibat\Mapping` adalah mirror (edit lokal → upload → rebuild `web`). Detail VPS/deploy lengkap ada di `CRM Map n Scrape.md` §2–3.
- Stack: Next.js 16 (baca `apps/web/AGENTS.md` / `node_modules/next/dist/docs/` sebelum kode khusus Next), Prisma + Postgres, wa-bridge (Baileys, kirim teks saja).
- Type-check: `cd apps/web && ../../node_modules/.bin/tsc --noEmit -p .` (setelah `prisma generate`). Tidak ada DB lokal.
- **Urutan deploy: migrasi DB (additive) dulu → baru rebuild `web`.** Image web tidak punya Prisma CLI: migrasi manual via `docker exec mapping-db-1 psql` dalam satu transaksi + insert baris `_prisma_migrations` (checksum = sha256 file migration.sql LF). Build >10 menit → jalankan detached di VPS, poll log `DONE`.
- Pemeriksa izin otomatis menolak upload `tar|ssh`, `docker exec psql`, dan rebuild sebagai "Production Deploy" sampai user mengizinkan/menjalankan sendiri via `!` — jangan akali, minta user jalankan.
- Jaga line ending: `schema.prisma`, `AppSidebar.tsx`, `translations.ts` di VPS berakhiran **CRLF** (edit Python mengubahnya ke LF → kembalikan ke CRLF sebelum upload). Paths dengan `[id]` perlu di-quote; di Windows `tar` memperlakukan `C:` sebagai host remote.
- Rahasia: `VPS_DW\Note.txt` berisi password console yang pernah tercetak di transkrip lama — user perlu rotate; jangan pernah dicetak.

## 2. Status terkini (live di prod)
**Fitur Jadwal `/schedule` (dibuat 2026-10-01, sudah live, migrasi DB sudah diterapkan).**
- Kalender gaya GCal: tampilan Bulan + Minggu, panel Agenda hari terpilih, daftar Terlambat, "+ Tambah jadwal" (Follow up, Demo GMeet, Visit, Lainnya), klik item untuk ubah/Selesai/Batalkan/Hapus/buka chat. Popup "Pengingat Follow Up" di sidebar punya tombol "📅 Jadwal" → `/schedule`.
- Follow up bisa diberi **jam** (opsional) dari: prompt follow up di `/chat`, ⏰ Tunda di sidebar, form `/schedule`.
- DB (migrasi `20261001120000_schedule_appointments`): `wa_contacts.follow_up_has_time`; tabel `lead_appointments` (kind demo_gmeet|visit|other, starts_at, duration_min, location, note, status scheduled|done|cancelled).
- Semantik jam: `followUpAt` date-only = tanggal itu 00:00 UTC (`hasTime=false`, baca hari dari ISO `slice(0,10)`); timed = ISO instant (server menganggap ada jam bila string mengandung "T").
- API: `GET /api/schedule?from&to`, `GET /api/schedule/lead-search?q=`, `POST /api/schedule/appointments`, `PATCH|DELETE /api/schedule/appointments/[id]`; `flag` & `follow-up` (snooze) menerima datetime; `follow-up-reminders` & `conversations` mengembalikan `followUpHasTime`.
- Membuat appointment otomatis menyalakan flag `appointment` (+ `tag_change`) pada semua wa_contact lead itu; flag tidak dimatikan saat appointment dibatalkan/selesai. Activity baru: `appointment_scheduled|done|cancelled`.
- File: `apps/web/src/app/schedule/{page,Modals,utils}.tsx`, `src/app/api/schedule/**`, perubahan `AppSidebar.tsx`, `chat/page.tsx`, `translations.ts` (kunci `sched*`), `reports/history/page.tsx`.

**Fitur Pengingat Follow Up (sidebar)** — sudah live sejak 2026-09-29: catatan per follow up, ✓ Sudah, ⏰ Tunda (Besok/3 hari/1 minggu/tanggal+jam), ✎ Catatan. API `PATCH /api/conversations/[id]/follow-up` (`done|snooze|note`). Kolom `wa_contacts.follow_up_note`.

**Insiden 2026-10-01 (pelajaran):** kode baru ter-rebuild sebelum migrasi DB → `/api/conversations` 500 (Prisma P2022, kolom tidak ada) dan `/chat` tidak memuat. Pulih setelah user menjalankan migrasi manual. Verifikasi pasca-pulih: conversations / schedule / follow-up-reminders / halaman `/schedule` semua 200.

Backup VPS: `~/Mapping/.deploy-backup-20261001/` (`src-pre-schedule.tgz`, `db-pre-schedule.dump`) dan `.deploy-backup-20260929/`, `.deploy-backup-20260930/`.

## 3. Yang perlu dicek user (belum diverifikasi)
1. **Belum diklik di browser** (hanya `tsc`, eslint file baru, HTTP 200). Ctrl+F5 lalu cek: `/schedule` Bulan & Minggu, klik item, tambah Follow up / Demo GMeet / Visit, ubah jadwal, ✓ Selesai/Batalkan, tombol "📅 Jadwal", input jam di ⏰ Tunda dan prompt `/chat`.
2. Perilaku: membuat appointment menyalakan tag Appointment lead (masuk kolom Appointment kanban) — apakah itu yang diinginkan? Jangan tes dengan lead asli tanpa niat.
3. Lint: 2 error react-hooks lama di `chat/page.tsx` (~baris 50 & 57), bukan dari perubahan ini.
4. Zona waktu: tampilan pakai zona browser; follow up date-only aman untuk UTC+ (WIB), bisa meleset sehari di UTC−.
5. **Belum di-commit** ke git (VPS & lokal), tercampur dengan pekerjaan sesi lain — pisahkan saat commit.
6. Belum ada item nav "Jadwal" di sidebar utama (hanya via popup / URL) — tanyakan user.

## 4. Backlog / langkah berikutnya
1. **Halaman `/followups`** (#3, #15–16): tabel lead diam setelah pitch (56 per analisis 2026-10-01; 51% tak pernah di-FU, balasan hampir selalu <24 jam) + lead menunggu balasan kita (24): hari sejak pitch, jumlah FU, pesan terakhir, aksi saran; reschedule/done/snooze. Reuse `lib/noReplyAfterPitch.ts`, `lib/nonResponsive.ts`. **Spesifikasi user terpotong** ("…merekap list tabel leads yang") — minta user melengkapi dulu.
2. Ide `/schedule`: klik slot kosong untuk membuat jadwal, drag-drop, day view, notifikasi appointment hari-H di sidebar, bulk "tunda semua".
3. Catatan lain dari daftar 19 poin: #5 bug tooltip/context menu `/chat` (perlu reproduksi); #7 detail lead/peta di panel `/chat`; #9/#10 kirim PDF/file dari CRM (butuh media di wa-bridge `send.ts`, risiko restart/re-pair); #11/#12 nomor surat otomatis + badge "Surat No. X" (`letters/generate/route.ts`, `letter_generated` sudah menyimpan `nomorSurat`); #14 catatan/status log (`POST /api/leads/[id]/notes` → `lead_activities` type `note`); #17/#18 analisis non-WA & rencana cold-call; #19 sync ke CRM tim `sales.sahaibat.com` tetap manual (tidak ada API; lihat `scripts/crm-sync/` dan `CRM Sync Pipeline.md`).
4. Keputusan kecil tertunda: samakan urutan kolom `/reports/kanban/overview` dengan `/daily`?; judul default `app/layout.tsx` masih "Create Next App"; relabel "Not-Interested" → "Diam setelah Pitch".

## 5. Cara melanjutkan
1. Baca file ini (dan `CRM Map n Scrape.md` §2–3 bila perlu detail VPS).
2. Cek prod: `curl http://103.93.162.31:3000/api/schedule` (200) dan `ssh -i VPS_DW/DWSSH.pem DzakiWismadi@103.93.162.31 "docker ps"` (web/db/wa-bridge up).
3. Tanyakan user: hasil tes manual `/schedule` (§3.1), keputusan §3.2 & §3.6, lalu lengkapi spesifikasi `/followups`.
4. Berikutnya: perbaiki bug dari tes user → `/followups` → #7 dan #11/#12.
