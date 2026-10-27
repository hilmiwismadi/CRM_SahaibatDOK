---
type: concept
status: aktif
updated: 2026-10-27
tags: [changelog]
---

# 🗓️ Changelog — Ter-deploy vs Lokal

> ✅ **Diverifikasi 2026-10-27 16:50** via `scripts/check-deploy-diff.sh` (baca-saja, dijalankan user dengan `!`): **167 file kode identik** lokal = VPS, **3 berbeda** (lihat di bawah), tidak ada file yang hanya ada di satu sisi. Jalankan ulang skrip ini setiap kali ragu.
> Legenda: ✅ terverifikasi di VPS · ⚠️ berbeda · ❔ belum diketahui

| Tanggal | Perubahan | Migrasi | Deploy | Sumber |
|---|---|---|---|---|
| 09-02 | Init: leads, aktivitas, WA, scrape, pipeline stage | init, pipeline_stages | ✅ | [[K-Riwayat-Migrasi]] |
| 09-06/07 | Contact chain, template, field lead tambahan, provinsi, override balasan | contact_chain s/d wa_replied_kind | ✅ | |
| 09-07–09-20 | Flag WA: needs_other_contact, needs_follow_up, no_wa_account, appointment, declined, letter_sent | wa_* | ✅ | |
| 09-21/29 | follow_up_at, follow_up_note | wa_follow_up_* | ✅ | |
| 09-30 | Label lead (dental/aesthetic/…) | lead_label | ✅ | [[CRM Map n Scrape]] |
| 10-01 | `/schedule` + appointments; `sync_daily_summaries`; tombol "Ringkas dengan Claude" dihapus | sync_daily_summaries, schedule_appointments | ✅ (route `summarize` tidak ada di VPS) | [[CRM Schedule and FU]] |
| 10-07 | Import 14 region (1.545 → 4.705 lead); filter region `/map`; backup otomatis | — | ✅ | [[10.VpsAccessAndDeploy]] |
| 10-14 | **Send Guard** + `/queue` + dispatcher | scheduled_messages | ✅ dipakai: 239 sent, 10 cancelled | [[CRM WA Restriction - Backfill dan Send Guard]] |
| 10-14 | **WA backfill** chat 13–14 Okt | — (data) | ✅ kemungkinan besar sudah: 166 pesan di jendela gap 13 Okt 14:25 – 14 Okt WIB | `scripts/wa-backfill/README.md` |
| 10-20 | Follow-up triage `/reports/followup` | followup_triage, followup_notes_important | ✅ | |
| 10-21 | `/reports/important` + note log; backfill demo | followup_note_logs | ✅ tabel ada (413 baris), **tetapi tidak tercatat di `_prisma_migrations`** | [[13.RekapDemo]] |
| ≤10-26 | **Timesheet v3** (lead baru per lead, demo manual) | — | ✅ file identik | [[12.TimesheetSync]] |
| ≤10-21 | Letters (PDF, mode sesi, subject email), reminder follow-up di sidebar, whitelist kontak bridge | — | ✅ identik | `git log` |

Data terakhir per pengecekan: pesan WA terbaru 2026-10-27 09:49 UTC (bridge hidup), ringkasan harian terakhir 2026-10-26. Container: web di-rebuild ±4 jam sebelum pengecekan, bridge hidup 13 hari, db 5 minggu.

## ⚠️ Berbeda lokal vs VPS (per 2026-10-27)
File lokal terakhir diubah 2026-10-21 17:22–17:29; `mapping-web-1` di-rebuild ±4 jam sebelum pengecekan. **Arah bedanya belum diketahui** (VPS lebih baru, atau lokal belum di-deploy):
- `apps/web/src/app/reports/followup/page.tsx`
- `apps/web/src/app/reports/important/page.tsx`
- `apps/web/src/app/api/reports/important/route.ts`

**Jangan deploy ketiga file ini dari lokal sebelum dibandingkan**, karena bisa menimpa perbaikan yang hanya ada di VPS.

## ⚠️ Git tidak mencerminkan kondisi
Commit terakhir `0b880cd` (2026-10-07). Sejak itu ada **155 perubahan belum di-commit** (termasuk 4 migrasi, Send Guard, triase, dan Brain). Riwayat fitur setelah 10-07 hanya ada di doc `Context/` dan changelog ini.

## Cara memperbarui
Setiap deploy: tambah satu baris (tanggal, perubahan, migrasi, ✅, commit/skrip), lalu jalankan `check-deploy-diff.sh`.
