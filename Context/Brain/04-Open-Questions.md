---
type: concept
status: aktif
updated: 2026-10-27
tags: [backlog]
---

# ❓ Pertanyaan Terbuka & Backlog

## Perlu verifikasi
- [x] ~~Status deploy Send Guard, WA backfill, timesheet v3, letters~~ → semua ✅ (2026-10-27, [[03-Changelog]])
- [x] ~~Route lama `/api/sync/summarize` di VPS?~~ → tidak ada
- [ ] **3 file berbeda lokal vs VPS** (`reports/followup`, `reports/important` + route-nya): mana yang benar? Lihat [[03-Changelog]]
- [ ] **Commit** 155 perubahan sejak `0b880cd` (2026-10-07) supaya git kembali berguna
- [ ] Tambahkan baris `20261021120000_followup_note_logs` ke `_prisma_migrations` di VPS (tabelnya sudah ada, barisnya belum)
- [ ] `api/reports/chat-activity` dan `api/reports/sales-summary` tidak dipanggil halaman mana pun → hapus atau pakai lagi?
- [ ] `Caddyfile` tidak ada di lokal, tetapi di-mount oleh compose profile `prod`. Apakah ada di VPS?
- [ ] Apakah `pipeline_stage` masih punya arti, atau sepenuhnya digantikan tag? ([[K-Kosakata-Stage]])
- [ ] Rencana `6.ReportsDashboardPlan` §5.1 (auto-advance responded) dan §5.2 (flag Ghosted 7 hari): mana yang sudah dibangun? (Auto-advance `responded` **ada** di bridge `db-writer.ts`.)

## Utang teknis
- [ ] **Re-import scrape menimpa `leads.phone_normalized`**: nomor manual bisa hilang ([[K-Kolom-CRM-Owned]])
- [ ] `backup-json.ts`/`restore-json.ts` tidak mencakup `lead_appointments`, `scheduled_messages`, `sync_daily_summaries`, `followup_triage`, `followup_note_logs`
- [ ] Komentar + env `ANTHROPIC_API_KEY` usang di `docker-compose.yml`
- [ ] Referensi salah `9.DailySummaryInput.md` di `scripts/crm-sync/build-summary-sql.mjs` (seharusnya `9.DailySyncInput.md`)
- [ ] Link rusak `[[9.GoogleSearchResults]]` di [[7.GmapsOverviewCheckSOP]]
- [ ] Input `classifyLead` dibangun ulang di 5 route → kandidat refactor menjadi satu helper
- [ ] File besar: `MapView.tsx` (1548), `chat/page.tsx` (984), `AppSidebar.tsx` (900)

## Backlog fitur / kerja
- [ ] Brown pin `no_phone` (290 lead): cek Gmaps belum dijalankan ([[8.GmapsCheckResults]])
- [ ] Region Blora belum di-import (`Context/blora-new-leads.csv`)
- [ ] 6 region scrape belum siap (runner kehabisan memori), lihat `scrape-output/PROGRESS-2026-10-07.md`
- [ ] Halaman `/followups` (spesifikasi terpotong di [[CRM Schedule and FU]]), penomoran surat, rencana cold-call
- [ ] Promote di CRM tim error 500 `facilities.id` (sejak 2026-09-14)
- [ ] Apakah PATCH stage di CRM tim membuat entri Journey? Bolehkan sync menimpa `batal`?

## Doc yang kosong / tipis
- [ ] `0.SystemPlanning.md` kosong → isi atau hapus
- [ ] `SahaibatExplanation` tidak punya file nomor 2
