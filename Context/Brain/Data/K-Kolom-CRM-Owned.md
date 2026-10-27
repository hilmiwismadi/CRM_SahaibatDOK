---
type: concept
status: aktif
updated: 2026-10-27
code: [apps/web/src/lib/upsertLeadsFromStaging.ts]
tables: [leads]
tags: [konsep, hotspot]
---

# Konsep: Kolom CRM-owned vs Kolom Scrape

Re-import scrape memakai raw SQL `INSERT … ON CONFLICT (google_place_id) DO UPDATE SET …` di `apps/web/src/lib/upsertLeadsFromStaging.ts`. **Hanya kolom scrape** yang boleh ada di `DO UPDATE SET`.

| Ditimpa saat re-import (scrape) | Tidak boleh disentuh (CRM-owned) |
|---|---|
| name, category, address, phone_raw, **phone_normalized**, website, email, rating, review_count, price_range, open_hours, geom, lat, lng, last_scraped_at, updated_at | pipeline_stage, notes, assigned_to, is_lost, lost_reason, custom_tags, label, label_note, trial_started_at, trial_health_status, trial_health_updated_at, active_contact_node_id |

Hanya diisi saat INSERT (tidak di-update): `google_maps_url`, `label` (auto-label dental/aesthetic dari `lib/leadAutoLabel.ts`). Tidak disentuh upsert: `province`, `business_type`, `phone_office`, `instagram_url` (turunan/backfill/manual).

> ⚠️ **Jebakan (diverifikasi 2026-10-27):** `phone_normalized` **ditimpa** saat re-import. Nomor WA yang diganti manual (mis. hasil berburu brown pin, [[4.NoWaAccountLeads]]) bisa kembali ke nomor Google Maps jika region itu di-scrape ulang. `wa_contacts` tidak ikut berubah, sehingga lead dan kontak bisa tidak sinkron. Pertimbangkan: jangan update `phone_normalized` bila sudah ada `wa_contacts` tertaut, atau simpan nomor manual di kolom terpisah. (Masuk [[04-Open-Questions]].)

Filter import: baris tanpa `google_place_id`/lat/lng di-skip; puskesmas dan `isNonClinic` (bank, apotek, dll.) dikecualikan.

## Dampak Perubahan: kolom baru di `leads`
- [ ] Tentukan: scrape atau CRM-owned?
- [ ] CRM-owned → pastikan **tidak** masuk `DO UPDATE SET`
- [ ] Perbarui tabel ini + [[leads]]

← [[leads]] · [[MOC-Pipeline-Lead-Scraping]]
