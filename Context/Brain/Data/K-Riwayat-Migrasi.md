---
type: concept
status: aktif
updated: 2026-10-27
code: [apps/web/prisma/migrations/]
tags: [konsep, ops]
---

# Konsep: Riwayat Migrasi & Prosedur Manual

| # | Migrasi | Arti |
|---|---|---|
| 1 | `20260902000000_init` | PostGIS, tabel inti, indeks GiST `geom` (manual) |
| 2 | `20260902020000_pipeline_stages` | Kolom trial + tabel stage/transition (**jangan drop indeks GiST**) |
| 3 | `20260906120000_contact_chain` | `wa_contacts.phone` nullable, `lead_contact_nodes`, `active_contact_node_id` |
| 4 | `20260906130000_dashboard_and_templates` | `lat/lng` nullable (lead manual), `message_templates` |
| 5 | `20260906140000_lead_extra_fields` | `phone_office`, `instagram_url`, `business_type` |
| 6 | `20260907070000_unique_root_contact_node` | Partial unique: satu root per lead |
| 7 | `20260907090000_lead_province` | `province` + indeks |
| 8 | `20260907100000_wa_replied_override` | `replied_override_at` |
| 9 | `20260907110000_wa_replied_kind` | `replied_override_kind` |
| 10 | `20260907120000_wa_needs_other_contact` | flag |
| 11 | `20260908090000_wa_needs_follow_up` | flag |
| 12 | `20260908110000_wa_no_account` | flag |
| 13 | `20260908130000_wa_appointment` | flag |
| 14 | `20260912120000_wa_declined` | flag |
| 15 | `20260920200000_wa_letter_sent` | flag |
| 16 | `20260921120000_wa_follow_up_at` | tanggal follow-up |
| 17 | `20260929120000_wa_follow_up_note` | catatan follow-up |
| 18 | `20260930100000_lead_label` | `label`, `label_note` |
| 19 | `20261001000000_sync_daily_summaries` | tabel ringkasan harian |
| 20 | `20261001120000_schedule_appointments` | `follow_up_has_time` + `lead_appointments` |
| 21 | `20261014120000_scheduled_messages` | antrean Send Guard |
| 22 | `20261020000000_followup_triage` | triase follow-up |
| 23 | `20261020120000_followup_notes_important` | `notes` Json + kolom `important_*` |
| 24 | `20261021120000_followup_note_logs` | log catatan |

## Status di VPS (2026-10-27)
Semua 24 migrasi sudah diterapkan, **tetapi** `_prisma_migrations` hanya mencatat sampai #23. Migrasi #24 `followup_note_logs` diterapkan lewat psql (`deploy-important-2026-10-21.sh`) tanpa insert barisnya. Akibatnya Prisma mengira #24 belum jalan; perbaiki dulu sebelum memakai alat migrasi Prisma terhadap DB ini.

## Prosedur di VPS (image produksi tanpa Prisma CLI)
1. `pg_dump` dulu.
2. scp `migration.sql` → `docker exec -i mapping-db-1 psql -v ON_ERROR_STOP=1 -U sahaibat -d sahaibat_mapping < migration.sql`.
3. Insert baris ke `_prisma_migrations` (nama migrasi + checksum sha256 file); contoh di `scripts/sendguard-deploy.sh`.
4. **Baru** rebuild web. (Urutan terbalik → Prisma P2022, insiden 2026-10-01.)

Lokal: `npm run prisma:migrate` (`migrate dev` butuh TTY, lihat [[LOCAL_DEV]]).

## Dampak Perubahan: migrasi baru
- [ ] Tambah baris di tabel ini + note `Data/` terkait
- [ ] Model baru → `apps/web/scripts/backup-json.ts` + `restore-json.ts`
- [ ] [[03-Changelog]]

← [[MOC-Deploy-Ops]] · [[MOC-Model-Data]]
