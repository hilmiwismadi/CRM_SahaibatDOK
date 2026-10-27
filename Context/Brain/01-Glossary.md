---
type: concept
status: aktif
updated: 2026-10-27
tags: [glossary]
---

# 📖 Glosarium

Kolom **Kanonik** = note yang menjadi sumber kebenaran.

## Produk & Sales
| Istilah | Arti | Kanonik |
|---|---|---|
| DOK | Platform Clinical AI + EMR untuk klinik/dokter (produk yang dijual) | [[0.SahaibatDokProduct]] |
| Kasih | Lapisan WhatsApp untuk pasien | [[0.SahaibatDokProduct]] |
| Konsensus / Kader | Produk SahAIbat lain (muncul di nav CRM tim) | [[0.CRMSahaibatUnderstanding]] |
| ICP | Dokter praktik mandiri, Klinik Pratama, (Puskesmas dikecualikan saat import) | [[1.SalesJobDesc]] |
| Conversion Credit | KPI utama (konversi berbayar) | [[1.SalesJobDesc]] |
| Demo | Pertemuan pertama (Gmeet / kunjungan). Untuk timesheet: `lead_appointments` done/lewat jadwal + demo manual | [[lead_appointments]], [[13.RekapDemo]] |
| Utama / Post Demo | Lanjut setelah demo / tidak lanjut (tab "Penting") | [[followup_triage]], [[13.RekapDemo]] |
| First Intro | Template pembuka resmi: "Selamat [Pagi/Siang/Sore], apakah benar ini kontak nomer [Nama]?" | [[5.WaTestMessageSend]] |
| Konfirmasi | Pesan "apakah benar ini kontak …" (dideteksi timesheet) | [[12.TimesheetSync]] |
| Pitch | Pesan "Perkenalkan saya …"; template kategori `pitch` | [[message_templates]] |

## Kategori lead (tag)
Semua dihitung oleh [[K-classifyLead]] dengan urutan prioritas di bawah (yang pertama cocok menang).

| Urutan | `LeadCategory` | Label UI | Sumber | Stage CRM tim |
|---|---|---|---|---|
| 0 | `untouched` | Belum Disentuh | stage `new` + belum ada kontak WA | — (tidak di-sync) |
| 1 | `no_wa_account` | Tidak Ada Kontak WA | flag `no_wa_account` | Prospect |
| 2 | `appointment` | Appointment | flag `appointment` | Demo |
| 3 | `declined` | Reject | flag `declined` | Lost |
| 4 | `needs_reply` | Belum Dijawab | dihitung: pesan terakhir inbound & tidak di-override | Contacted |
| 5 | `replied_by_bot` | Dijawab Bot | `replied_override_kind='bot'` | Contacted |
| 6 | `needs_other_contact` | Further Contact | flag `needs_other_contact` | Contacted |
| 7 | `needs_follow_up` | Follow Up | flag `needs_follow_up` (+ `follow_up_at/note/has_time`) | Contacted |
| 8 | `letter_sent` | Letter Sent | flag `letter_sent` (dari `/letters`) | Contacted |
| 9 | `no_reply_after_pitch` | Not-Interested | dihitung SQL: membalas lalu diam setelah pitch | Contacted (sengaja bukan Lost) |
| 10 | `non_responsive` | Non-Responsive | dihitung SQL: tidak pernah membalas | Lost |
| 11 | `active` | Perlu Diklasifikasi | sisa | Contacted |

## WhatsApp & peta
| Istilah | Arti | Kanonik |
|---|---|---|
| Brown pin (coklat) | `no_wa_account` ATAU `phone_normalized` kosong (`MapView.tsx` `pinColor()`); dibagi grup NoWA vs NoPhone | [[6.BrownPinLeads]], [[7.GmapsOverviewCheckSOP]] |
| Grup pin | Untouched (slate), Tidak Ada Kontak WA (coklat), Later (ungu = lead berlabel), Contacted (biru). Prioritas: label > noWA > untouched > contacted | [[CRM Map n Scrape]] |
| Label | `leads.label`: dental / aesthetic / low_rating / government_affiliate / other = "alasan belum dihubungi" | [[leads]] |
| @lid / LID | ID internal WhatsApp Linked-Device; harus dipetakan ke nomor HP | [[4.ChatHistoryConcern]], [[wa_contacts]] |
| Resync | `POST /resync-contacts` di bridge: memanaskan cache LID↔nomor | [[4.ChatHistoryConcern]] |
| `/check-wa` | Cek nomor terdaftar di WA; **bukan bukti bisa menerima pesan** | [[4.NoWaAccountLeads]] |
| Contact chain | Pohon "siapa memberi kontak siapa" per lead | [[lead_contact_nodes]] |
| Send Guard | Pembatas laju outreach WA, kelebihannya masuk antrean | [[K-Jalur-Kirim-WA]], [[scheduled_messages]] |
| Outreach | Pesan ke kontak yang tidak inbound dalam 24 jam terakhir (hanya ini yang dihitung kuota) | [[K-Jalur-Kirim-WA]] |
| Restriksi WA | Insiden ban spam 2026-10-13 | [[CRM WA Restriction - Backfill dan Send Guard]] |

## Pipeline & sync
| Istilah | Arti | Kanonik |
|---|---|---|
| `pipeline_stage` | Stage internal Mapping (`new` → `contacted` → `responded` → …); jarang dipakai, tag yang dominan | [[K-Kosakata-Stage]] |
| Stage CRM tim | prospek / kontak / demo / uji_coba / konversi / batal; sync **hanya naik** | [[K-Kosakata-Stage]] |
| Kolom CRM-owned | Kolom `leads` yang tidak boleh ditimpa re-import scrape | [[K-Kolom-CRM-Owned]] |
| Dailylog / Ringkasan Claude | `/sync/dailylog`; ringkasan per lead per hari di [[sync_daily_summaries]] | [[9.DailySyncInput]] |
| Leadinput | `/sync/leadinput`: CSV untuk `/lead-engine` CRM tim | [[CRM Sync Pipeline]] |
| Timesheet | `/sync/timesheet`: draf jam kerja mingguan → script console | [[12.TimesheetSync]] |
| Lead Engine score | Fit 30 / Opportunity 25 / Digital 25 / Reachability 20 | [[0.CRMSahaibatUnderstanding]] |
| WIB | Semua "tanggal" bisnis memakai WIB; DB menyimpan UTC | [[K-Zona-Waktu-WIB-UTC]] |
