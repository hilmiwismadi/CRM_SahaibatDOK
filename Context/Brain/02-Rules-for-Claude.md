---
type: concept
status: aktif
updated: 2026-10-27
tags: [aturan, keamanan]
---

# ⚠️ Aturan untuk Claude (dan manusia)

Kumpulan aturan yang sebelumnya tersebar di doc 5, 10, 12 dan ContinueSession. **Baca sebelum bertindak.**

## Pesan & pihak luar
1. **Jangan pernah mengirim WA tanpa konfirmasi eksplisit**, terutama setelah context compaction atau jeda sesi. (Insiden 2026-09-22: 17 pesan tes terkirim tanpa konfirmasi ulang, lihat [[5.WaTestMessageSend]].)
2. Semua kirim WA dari app wajib lewat [[K-Jalur-Kirim-WA]] (Send Guard), jangan memanggil bridge `/send` langsung.
3. Script pencarian nomor (gmaps-check, wa-backfill) **hanya baca**; hasilnya kandidat, BD yang memutuskan.

## VPS & produksi
4. Claude **tidak bisa** deploy produksi, dan sejak 2026-10-27 juga tidak bisa membaca produksi via SSH (diblokir auto-mode classifier "Production Deploy" / "Production Reads"). **Jangan diakali.** Siapkan skrip, user menjalankannya dengan `! <perintah>`. Contoh: `scripts/check-deploy-diff.sh`.
5. Jangan sentuh container `jacked-*` (milik app lain). Container kita: `mapping-web-1`, `mapping-db-1`, `mapping-wa-bridge-1`.
6. **Jangan pernah `docker compose down -v`** (menghapus volume DB dan sesi WA).
7. **Migrasi dulu, baru rebuild web.** (Insiden 2026-10-01 Prisma P2022.) Migrasi diterapkan manual via `psql -v ON_ERROR_STOP=1` + insert baris `_prisma_migrations`; image produksi tidak punya Prisma CLI. Detail: [[K-Riwayat-Migrasi]].
8. Sebelum deploy: `pg_dump` dulu, bandingkan `md5sum` lokal vs VPS (abaikan CRLF), lalu scp hanya file yang berubah. Rebuild memakai **semua** source di VPS, jadi file VPS yang lebih baru/lama ikut masuk. Kanonik: [[10.VpsAccessAndDeploy]].
9. **Jangan hapus `apps/wa-bridge/auth_state/`** (volume `wa-session`). Pairing ulang terlihat seperti login mencurigakan bagi WhatsApp.
10. Restore backup selalu ke DB `restore_test` dulu; restore produksi hanya dengan izin. Kanonik: [[11.DbBackup]].

## Kode
11. `apps/web/AGENTS.md` **sah**: dibuat otomatis oleh Next.js 16.3.4. Baca `node_modules/next/dist/docs/` sebelum menulis API khusus Next 16 (mis. `proxy.ts` menggantikan middleware).
12. Kolom CRM-owned baru → wajib dikecualikan dari `upsertLeadsFromStaging.ts`. Lihat [[K-Kolom-CRM-Owned]].
13. Model Prisma baru → tambahkan ke `apps/web/scripts/backup-json.ts` + `restore-json.ts` (saat ini 5 model tidak ter-backup oleh JSON).
14. `wa_messages.sent_at` = timestamp tanpa zona berisi **UTC**. Jangan pakai `sent_at::date`. Lihat [[K-Zona-Waktu-WIB-UTC]].
15. Jangan rename string `lead_activities.type`. Lihat [[K-Tipe-Aktivitas]].
16. Route/aset publik baru → tambahkan pengecualian di matcher `apps/web/src/proxy.ts`.

## Teknis shell (Windows)
17. Backslash di heredoc/`-c` Bash bisa "termakan"; untuk script console yang panjang, tulis ke file dulu. (doc 12)
18. File di VPS bisa ber-CRLF; bandingkan dengan `tr -d '\r' | md5sum`.
19. Path SSH: pakai path absolut `/d/Hilmi/Coding/Sahaibat/VPS_DW/DWSSH.pem` (cwd sesi bisa berpindah).
20. Dev lokal crash "Jest worker…" → hapus `apps/web/.next`. Lihat [[7.RecurringTurbopackCrash]].

## Dokumentasi
21. **Jangan menulis rahasia** (IP, password, token, nomor HP massal) di Brain; cukup tulis lokasinya (`VPS_DW/`, `.env`).
22. Snapshot generated ([[6.BrownPinLeads]], [[8.GmapsCheckResults]]): generate ulang, jangan diedit.
23. Setelah mengubah fitur: perbarui note `F-*` (Riwayat + Dampak Perubahan) dan [[03-Changelog]].
