---
type: concept
status: aktif
updated: 2026-10-27
code: [apps/web/src/lib/waSend.ts, apps/web/src/lib/sendGuard.ts, apps/web/src/lib/scheduledDispatcher.ts, apps/web/src/instrumentation.ts, apps/wa-bridge/src/routes/send.ts]
tables: [wa_contacts, wa_messages, scheduled_messages, lead_activities, leads]
tags: [konsep, hotspot]
---

# Konsep: Jalur Kirim WA (Send Guard)

```
POST api/conversations/[id]/messages  ┐
POST api/leads/[id]/messages          ├─▶ waSend.sendOrSchedule ─▶ sendGuard.planSend
PATCH api/scheduled-messages/[id]     ┘          │ boleh sekarang          │ harus tunggu
                                                  ▼                         ▼
                              sendOutboundToPhone        scheduled_messages (HTTP 202)
                                                  │                         │
                                                  ▼        scheduledDispatcher (tick, SKIP LOCKED, planSend ulang)
                              wa-bridge POST /send ◀────────────────────────┘
                                                  │ 200 → upsert wa_contacts, insert wa_messages,
                                                  │       aktivitas wa_message_sent, stage new→contacted
                                                  │ 422 not_on_whatsapp → flag no_wa_account + tag_change
                                                  │ 503 → bridge putus
```

## Aturan `GUARD` (`sendGuard.ts`)
- Hanya **outreach** yang dihitung (kontak tanpa inbound 24 jam terakhir); membalas chat aktif tidak dibatasi kuota.
- Jeda 60–120 dtk antar-outreach; 240–420 dtk bila teks mirip (Jaccard ≥ 0,75 dalam 180 menit terakhir).
- Maks 5 per 10 menit, 20 per jam, 40 per hari WIB; jendela kirim 08:00–20:00 WIB.
- `planSend` **tidak pernah memblokir**; ia mengembalikan slot paling awal yang masih "terlihat manusia".

Latar: restriksi WA 2026-10-13 ([[CRM WA Restriction - Backfill dan Send Guard]]). Status deploy: [[03-Changelog]].

## Dampak Perubahan
- [ ] Mengubah kontrak bridge `/send` (kode 422/503) → `waSend.ts` (`WaSendError`) + `apps/wa-bridge/src/routes/send.ts`
- [ ] Mengubah angka → hanya `GUARD` (belum ada setting UI/DB)
- [ ] Jalur kirim baru → **wajib** lewat `sendOrSchedule`, jangan panggil bridge langsung
- [ ] Normalisasi nomor (`packages/shared/src/phone.ts` `phoneToJid`) dipakai di sini dan di bridge

← [[MOC-WhatsApp-Chat]] · [[scheduled_messages]]
