---
type: data
status: aktif
updated: 2026-10-27
tables: [lead_contact_nodes]
tags: [data]
---

# `lead_contact_nodes` (model `LeadContactNode`)

Pohon kontak per lead (mis. dokter → admin → marketing). Menentukan nomor tujuan chat per lead.

## Kolom penting
- `parent_id` (self-relation), `wa_contact_id` (unik), `phone_normalized` (snapshot beku), `display_name`, `role` (teks bebas), `handoff_note`
- `is_root`: partial unique index, **satu root per lead** (memperbaiki race condition)
- `leads.active_contact_node_id` → node yang sedang dipakai

## Ditulis oleh
- `lib/contactChain.ts` (`ensureRootContactNode`)
- `api/leads/[id]/contacts` POST, `contacts/active` PATCH (aktivitas `contact_chain_updated`)

## Dibaca oleh
- `lib/contactChain.ts` (`getActiveContactNode`)
- `api/leads/[id]/messages` (kirim ke node aktif)
- `components/ContactChainTree.tsx` (chat + `/leads/[id]/contacts`)

## Migrasi
contact_chain, unique_root_contact_node

## Backup JSON
✅ termasuk

← [[MOC-Model-Data]]
