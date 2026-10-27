---
type: data
status: aktif
updated: 2026-10-27
tables: [message_templates]
tags: [data]
---

# `message_templates` (model `MessageTemplate`)

Template pesan untuk Composer di `/chat`.

## Kolom penting
- `name` (unik), `category` (default `general`), `message`

## Ditulis oleh
- `/templates` → `api/templates`, `api/templates/[id]`

## Dibaca oleh
- `chat/Composer.tsx` (+ `lib/templateVariables.ts`, `normalizeClinicName.ts`)
- `lib/noReplyAfterPitch.ts`

## Migrasi
dashboard_and_templates

## ⚠️ Perhatian
Nilai `category = 'pitch'` **dipakai logika** `noReplyAfterPitch`; mengganti nama kategori mengubah kategori lead.

## Backup JSON
✅ termasuk

← [[MOC-Model-Data]]
