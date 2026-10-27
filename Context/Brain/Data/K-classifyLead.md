---
type: concept
status: aktif
updated: 2026-10-27
code: [apps/web/src/lib/leadSegmentation.ts, apps/web/src/lib/noReplyAfterPitch.ts, apps/web/src/lib/nonResponsive.ts, apps/web/src/lib/crmStageMapping.ts]
tables: [wa_contacts, wa_messages, leads]
tags: [konsep, hotspot]
---

# Konsep: `classifyLead` & `LeadCategory`

**Sumber kebenaran tunggal** kategori lead: `apps/web/src/lib/leadSegmentation.ts`. Semua tempat memakai label yang sama (badge chat, chip filter, context menu, funnel laporan, kolom kanban, warna pin peta).

## Logika (`classifyLead(input)`)
1. `pipeline_stage = 'new'` dan belum ada kontak WA → `untouched`
2. Untuk setiap kontak lead: kumpulkan flag + hitung `needs_reply` (pesan terakhir inbound **dan** override tidak aktif) dan `replied_by_bot`
3. Yang **pertama** cocok menang: `no_wa_account` → `appointment` → `declined` → `needs_reply` → `replied_by_bot` → `needs_other_contact` → `needs_follow_up` → `letter_sent` → `no_reply_after_pitch` → `non_responsive` → `active`

`no_reply_after_pitch` dan `non_responsive` dihitung lewat raw SQL di `noReplyAfterPitch.ts` / `nonResponsive.ts` (mengembalikan set id kontak).

Label UI dan stage CRM tim: [[01-Glossary]] (tabel Kategori lead).

## Pemakai
- **API** (masing-masing membangun `ContactTagInput` sendiri): `api/leads/route.ts`, `api/conversations/route.ts`, `api/reports/segmentation`, `api/reports/classify`, `api/sync/dailylog`
- **Halaman:** chat (`page.tsx`, `ConversationList.tsx`, `types.ts`), dashboard, map, letters, reports overview / kanban (overview, daily, shared) / history / classify
- `crmStageMapping.ts` (`Record<LeadCategory, CrmStage|null>`)

## Dampak Perubahan: menambah/mengubah kategori atau flag
- [ ] `prisma/schema.prisma` + folder migrasi (terapkan manual di VPS **sebelum** rebuild, lihat [[K-Riwayat-Migrasi]])
- [ ] `leadSegmentation.ts`: type, `CATEGORY_ORDER`, label ID + EN, warna, `REPLY_BRANCH_GROUPS`, `classifyLead`
- [ ] 5 route di atas (input `ContactTagInput`)
- [ ] `crmStageMapping.ts` (TypeScript error kalau lupa, karena `Record`)
- [ ] `api/conversations/[id]/flag` **dan** `api/leads/[id]/quick-tag` + `QuickTagAction` di `reports/kanban/shared.tsx`
- [ ] `api/reports/kanban-history` (hitungan event)
- [ ] Context menu chat + `chat/types.ts`, tampilan tag di `/letters`, `pinColor`/`groupOf` di `map/MapView.tsx`, `lib/i18n/translations.ts`
- [ ] Note: [[wa_contacts]], [[01-Glossary]], [[03-Changelog]]

← [[MOC-Model-Data]] · [[MOC-Arsitektur-App]]
