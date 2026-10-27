---
type: concept
status: aktif
updated: 2026-10-27
tables: [lead_activities]
tags: [konsep, hotspot]
---

# Konsep: Tipe Aktivitas (`lead_activities.type`)

String bebas; **tidak ada enum**. Rename = laporan riwayat/kanban rusak diam-diam.

| `type` | Ditulis oleh |
|---|---|
| `wa_message_received` | wa-bridge `whatsapp/inbound.ts` |
| `wa_message_sent` | `lib/waSend.ts` |
| `stage_change` | `lib/waSend.ts` (new→contacted), `api/leads/[id]` |
| `tag_change` | `waSend.ts` (auto no_wa_account), `conversations/[id]/flag`, `conversations/[id]/follow-up`, `leads/[id]/quick-tag`, `schedule/appointments` |
| `replied_marked` | `conversations/[id]/replied`, `leads/[id]/quick-tag` |
| `follow_up_done`, `follow_up_snoozed` | `conversations/[id]/follow-up` |
| `appointment_scheduled` | `schedule/appointments` POST |
| `appointment_<status>` (done / cancelled / scheduled) | `schedule/appointments/[id]` PATCH (string dirangkai!) |
| `label_change` | `leads/[id]/label` |
| `letter_generated` | `letters/generate` |
| `contact_chain_updated` | `leads/[id]/contacts/active` |
| `manual_edit` | `api/leads` POST, `api/leads/[id]` |

Disebut di komentar schema tetapi tidak ditemukan penulisnya di kode (2026-10-27): `note`, `scrape_update`, `trial_health_update`. Bridge memajukan stage ke `responded` di `db-writer.ts`; cek apakah ikut menulis `stage_change`.

## Pembaca
- `api/reports/kanban-history` (event per hari/minggu), `api/reports/activity-log` (`/reports/history`)
- `lib/i18n/translations.ts` `ACTIVITY_TYPE_LABELS`, `map/MapView.tsx` `activityLabel`
- `api/leads/[id]/activities` (timeline)

## Dampak Perubahan: tipe baru
- [ ] Penulis (route) + `ACTIVITY_TYPE_LABELS` + `activityLabel` MapView
- [ ] Putuskan apakah dihitung di `kanban-history`
- [ ] Tambahkan ke tabel ini

← [[lead_activities]]
