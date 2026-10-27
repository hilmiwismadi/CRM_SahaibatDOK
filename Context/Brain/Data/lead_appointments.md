---
type: data
status: aktif
updated: 2026-10-27
tables: [lead_appointments]
tags: [data]
---

# `lead_appointments` (model `LeadAppointment`)

Demo/kunjungan terjadwal per lead.

## Kolom penting
- `kind`: demo_gmeet | visit | other
- `starts_at`, `duration_min` (default 60), `location` (link Gmeet/alamat), `note`
- `status`: scheduled | done | cancelled

## Ditulis oleh
- `api/schedule/appointments` POST (juga menyalakan flag `wa_contacts.appointment` + aktivitas `appointment_scheduled`)
- `api/schedule/appointments/[id]` PATCH/DELETE (aktivitas `appointment_<status>`)

## Dibaca oleh
- `/schedule`, `api/sync/timesheet` (hitung Demo), `api/reports/followup`, `important`, `kanban-history`

## Migrasi
schedule_appointments (2026-10-01)

## ⚠️ Perhatian
Demo di timesheet = done atau scheduled yang sudah lewat. Deteksi Gmeet otomatis hanya untuk link `meet.google.com`.

## Backup JSON
❌ **tidak termasuk** `backup-json.ts` (hanya pg_dump)

← [[MOC-Model-Data]]
