---
type: moc
status: aktif
updated: 2026-10-27
---

# Model Data

PostgreSQL 16 + PostGIS, Prisma. **Tidak ada enum Prisma**: semua status berupa string bebas ("config, not enum"). 15 tabel.

## Note Brain
- **Lead:** [[leads]] · [[lead_activities]] · [[lead_appointments]] · [[lead_contact_nodes]]
- **WhatsApp:** [[wa_contacts]] · [[wa_messages]] · [[scheduled_messages]] · [[message_templates]]
- **Pipeline:** [[pipeline_stage_defs]]
- **Scrape:** [[scrape_jobs]]
- **Sync & follow-up:** [[sync_daily_summaries]] · [[followup_triage]] · [[followup_note_logs]]
- **Konsep:** [[K-classifyLead]] · [[K-Tipe-Aktivitas]] · [[K-Kolom-CRM-Owned]] · [[K-Kosakata-Stage]] · [[K-Zona-Waktu-WIB-UTC]] · [[K-Riwayat-Migrasi]] · [[K-Jalur-Kirim-WA]]

## Doc sumber
- `apps/web/prisma/schema.prisma`
- [[ARCHITECTURE]] (sebagian)
- [[5.DataBackupGuide]] (lokasi tag)

## Relasi utama
```
leads 1─* lead_activities / lead_appointments / sync_daily_summaries / followup_note_logs
leads 1─1 followup_triage
leads 1─* wa_contacts 1─* wa_messages
leads 1─* lead_contact_nodes (pohon, parent_id) ; leads.active_contact_node_id → node aktif
lead_contact_nodes 1─1 wa_contacts
leads *─1 pipeline_stage_defs
scrape_jobs 1─* stg_scrape_results ──(upsert)──▶ leads
scheduled_messages ··· (phone_normalized, lead_id lunak, tanpa FK)
```

## Query Dataview
```dataview
TABLE status, tables AS "Tabel"
FROM "Mapping/Context/Brain/Data"
SORT file.name
```
