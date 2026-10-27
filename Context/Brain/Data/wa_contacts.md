---
type: data
status: aktif
updated: 2026-10-27
tables: [wa_contacts]
tags: [data]
---

# `wa_contacts` (model `WaContact`)

Satu baris per JID WhatsApp. **Tempat semua flag/tag manual.**

## Kolom penting
- Identitas: `jid` (unik), `phone_normalized` (nullable, @lid bisa belum terpetakan), `lead_id` (nullable = kontak pribadi/tak tertaut), `display_name`, `linked_at`
- Override balasan: `replied_override_at`, `replied_override_kind` (manual | bot). Kedaluwarsa otomatis bila ada inbound lebih baru
- Flag: `needs_other_contact`, `needs_follow_up` (+ `follow_up_at`, `follow_up_note`, `follow_up_has_time`), `no_wa_account`, `appointment`, `declined`, `letter_sent`

## Ditulis oleh
- wa-bridge `inbound.ts`/`db-writer.ts` (upsert saat pesan masuk, link ke lead via nomor, merge saat `lid-mapping.update`)
- `lib/waSend.ts` (upsert saat outbound; auto `no_wa_account` saat bridge 422)
- `api/conversations/[id]/flag`, `/replied`, `/follow-up`
- `api/leads/[id]/quick-tag` (per lead, memilih kontak utama)
- `api/schedule/appointments` (flag `appointment`)
- Bridge purge harian: kontak **tak tertaut** > 14 hari dihapus (pesan ikut cascade)

## Dibaca oleh
- [[K-classifyLead]] (via 5 route)
- `/chat`, `/map`, `/letters`, `/schedule`, sidebar reminder, `crmSyncCsv.ts`

## Migrasi
init + wa_replied_override, wa_replied_kind, wa_needs_other_contact, wa_needs_follow_up, wa_no_account, wa_appointment, wa_declined, wa_letter_sent, wa_follow_up_at, wa_follow_up_note, schedule_appointments

## ⚠️ Perhatian
Dua jalur tagging (`conversations/[id]/flag` per kontak vs `leads/[id]/quick-tag` per lead) harus tetap sinkron. Menambah flag = lihat checklist di [[K-classifyLead]].

## Backup JSON
✅ termasuk

← [[MOC-Model-Data]]
