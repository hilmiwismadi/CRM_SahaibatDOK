---
type: data
status: aktif
updated: 2026-10-27
tables: [followup_triage]
tags: [data]
---

# `followup_triage` (model `FollowupTriage`)

Triase follow-up per lead (1:1, PK `lead_id`). Juga menyimpan klasifikasi "Penting".

## Kolom penting
- `priority`: hot | warm | try | closed; `action`, `due_date`, `status` (open | done | snoozed), `snooze_until`, `source` (claude | manual), `triaged_on`
- `notes` (Json list `[{id, text, done, …}]`)
- `important_section` (main | post_gmeet), `important_stage`, `important_status`, `no_follow_reason`

## Ditulis oleh
- SQL dari sesi Claude (`scripts/crm-sync/summaries/followup-*.sql`, `important-2026-10-21.sql`)
- `api/reports/followup/[leadId]` PATCH (UI)

## Dibaca oleh
- `/reports/followup`, `/reports/important`

## Migrasi
followup_triage, followup_notes_important (2026-10-20)

## ⚠️ Perhatian
Tanggal disimpan sebagai string, bukan timestamp.

## Backup JSON
❌ **tidak termasuk** `backup-json.ts` (hanya pg_dump)

← [[MOC-Model-Data]]
