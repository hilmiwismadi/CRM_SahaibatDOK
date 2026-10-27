---
type: data
status: aktif
updated: 2026-10-27
tables: [followup_note_logs]
tags: [data]
---

# `followup_note_logs` (model `FollowupNoteLog`)

Log perubahan bullet `followup_triage.notes`.

## Kolom penting
- `lead_id`, `note_id`, `action` (added | done | undone | edited | deleted), `text`, `at`

## Ditulis oleh
- `api/reports/followup/[leadId]` PATCH

## Dibaca oleh
- `reports/followupParts.tsx` (`NoteLogList`), `/reports/important`

## Migrasi
followup_note_logs (2026-10-21)

## Backup JSON
❌ **tidak termasuk** `backup-json.ts` (hanya pg_dump)

← [[MOC-Model-Data]]
