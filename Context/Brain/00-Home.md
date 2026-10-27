---
type: moc
status: aktif
updated: 2026-10-27
tags: [hub]
---

# 🧠 Second Brain — CRM SahAIbat (Mapping)

Pintu masuk tunggal. **Cara pakai:** pilih topik di bawah → buka MOC → buka note fitur/data → baca hanya file kode yang tercantum.

> Rencana dan keputusan desain: [[14.SecondBrainPlan]]

## Navigasi cepat
- 📖 [[01-Glossary]]: semua istilah (tag, stage, brown pin, dll.)
- ⚠️ [[02-Rules-for-Claude]]: aturan keselamatan. **Wajib dibaca sebelum menyentuh VPS atau mengirim WA.**
- 🗓️ [[03-Changelog]]: apa yang sudah ter-deploy vs masih lokal
- ❓ [[04-Open-Questions]]: backlog dan pertanyaan terbuka

## Topik (MOC)
| Bisnis | Aplikasi | Operasional |
|---|---|---|
| [[MOC-Produk-Pasar]] | [[MOC-Arsitektur-App]] | [[MOC-Deploy-Ops]] |
| [[MOC-Proses-Sales]] | [[MOC-Model-Data]] | [[MOC-Backup-Recovery]] |
| [[MOC-Sync-CRM-Tim]] | [[MOC-WhatsApp-Chat]] | [[MOC-Pipeline-Lead-Scraping]] |
| | [[MOC-Followup-Jadwal]] | [[MOC-Jangkauan-WA]] |
| | [[MOC-Laporan-Peta]] | |

## Peta sistem (1 paragraf)
Lead klinik/dokter di-scrape dari Google Maps (gosom) → `stg_scrape_results` → di-upsert ke [[leads]]. Sales mengirim chat WA lewat web app (`apps/web`, Next 16) → [[K-Jalur-Kirim-WA]] → `apps/wa-bridge` (Baileys, nomor pribadi) → WhatsApp. Balasan masuk lewat bridge → [[wa_contacts]] / [[wa_messages]]. Flag manual di `wa_contacts` + riwayat chat → [[K-classifyLead]] → satu kategori per lead, yang dipakai chat, peta, kanban, laporan, dan sync. Hasil kerja diekspor manual ke CRM tim `sales.sahaibat.com` ([[MOC-Sync-CRM-Tim]]). Semua berjalan di satu VPS (Docker) dan di-backup 4×/hari ([[MOC-Backup-Recovery]]).

## Status Fase
- [x] Fase 1: fondasi + MOC (2026-10-27)
- [x] Fase 2: model data + konsep (2026-10-27)
- [ ] Fase 3: note fitur `Features/`
- [ ] Fase 4: `Systems/`, `SOP/`, `Incidents/`
- [ ] Fase 5: rapikan doc lama (frontmatter + pointer kanonik)
- [ ] Fase 6: `Mapping/CLAUDE.md`
