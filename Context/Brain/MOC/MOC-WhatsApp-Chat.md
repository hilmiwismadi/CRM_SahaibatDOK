---
type: moc
status: aktif
updated: 2026-10-27
---

# WhatsApp & Chat

Bridge Baileys memakai nomor pribadi. Masuk: WA → bridge → DB. Keluar: web → Send Guard → bridge `/send` → WA. Pesan yang dikirim dari HP **tidak tercatat** (`fromMe` di-skip).

## Note Brain
- [[wa_contacts]]
- [[wa_messages]]
- [[scheduled_messages]]
- [[message_templates]]
- [[lead_contact_nodes]]
- [[K-Jalur-Kirim-WA]]
- Fase 3: [[F-Chat-Inbox]], [[F-Tag-dan-Flag]], [[F-Antrean-Kirim]], [[F-Template]]
- Fase 4: [[S-WA-Bridge]]

## Doc sumber
- [[4.ChatHistoryConcern]]: sesi WA vs riwayat chat, resync LID
- [[CRM WA Restriction - Backfill dan Send Guard]]: insiden 10-13, backfill, Send Guard
- [[3.CRMConcept]]: asal masalah @lid
- [[5.DataBackupGuide]] §1: lokasi tag chat
- `scripts/wa-backfill/README.md`
