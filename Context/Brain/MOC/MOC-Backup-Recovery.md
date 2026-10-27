---
type: moc
status: aktif
updated: 2026-10-27
---

# Backup & Recovery

Tiga lapis backup.

## Note Brain
- [[02-Rules-for-Claude]] (aturan restore)
- Fase 4: [[S-Sistem-Backup]], [[SOP-Restore-Backup]]

## Doc sumber
- [[11.DbBackup]]: **kanonik**
- [[5.DataBackupGuide]]: backup JSON lokal (sebagian usang)
- [[4.ChatHistoryConcern]] §4: migrasi pg_dump/pg_restore

## Ringkasan
| Lapis | Di mana | Jadwal | Retensi |
|---|---|---|---|
| VPS `scripts/backup-db.sh` (pg_dump -Fc, verifikasi `pg_restore -l`, flock) | `~/Mapping/backups/{auto,daily,weekly}` | cron 00:05/06:05/12:05/18:05 WIB | auto 28, daily 60, weekly 26 |
| Laptop `scripts/pull-vps-backups.ps1` (Task Scheduler "Sahaibat CRM DB Backup Pull") | `D:\Hilmi\Coding\Sahaibat\Backups\vps-crm-db\` | saat logon + tiap 2 jam | auto 7 hari, daily 365 hari, weekly ∞ |
| Pre-change manual | `Mapping/backups/mapping_dump_<ts>[_pre_<perubahan>].custom`; VPS `backups/pre-<x>-<tgl>/` | sebelum perubahan berisiko | manual |
| JSON (`npm run backup`) | `apps/web/backups/backup-latest.json` | manual | ⚠️ tidak mencakup 5 tabel baru |

**Tidak ter-backup:** sesi WA (`auth_state`; salinan lama di `Mapping/backups/auth_state_20260909_150601/`), `.env`, Caddyfile.
**Kesehatan:** lihat `Backups/vps-crm-db/pull.log` (WARN kalau file terbaru > 13 jam) dan `last-success.txt`.
