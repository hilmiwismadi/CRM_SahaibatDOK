# Backfill chat WA setelah restriction (13–14 Okt 2026)

CRM berhenti mencatat pesan **13 Okt 2026 ~14:25 WIB** (sesi wa-bridge terputus). Pesan sesudahnya
ada di HP/WA Web tapi tidak di `wa_messages`. Alur: **WA Web → file JSON → SQL → VPS**.

## 1. Ambil data dari WA Web
1. (Opsional, bila tanggal beda) perbarui daftar target: edit tanggal di `targets.sql`, jalankan
   `ssh -i VPS_DW/DWSSH.pem DzakiWismadi@103.93.162.31 "docker exec -i mapping-db-1 psql -U sahaibat sahaibat_mapping -At" < targets.sql > targets.json`
   lalu `node build.mjs --cutoff 2026-10-13T00:00:00+07:00`.
   `wa-export.js` yang ada sekarang sudah berisi **50 lead** yang punya pesan tercatat sejak 13 Okt, cutoff 13 Okt 00:00 WIB.
2. Buka https://web.whatsapp.com (login, nomor yang sama), jangan kirim apa pun. F12 → Console.
   Ketik `allow pasting` + Enter (Chrome meminta ini), paste isi **`wa-export.js`**, Enter.
3. Tes dulu: buka satu chat manual → `__bf.diagnose()` (harus `rows > 0`, `searchBox: true`, `parsed` berisi pesan benar).
4. `await __bf.run()` — otomatis cari tiap nomor di kolom search, scroll ke atas sampai cutoff, kumpulkan pesan.
   Lihat log `[n/50] …`. Hentikan dengan `__bf.stop()`. Bisa dilanjutkan (progres tersimpan di localStorage).
5. Chat yang `not_found`/`error`: buka manual, lalu `await __bf.grab("+62812…")`.
6. `__bf.summary()` untuk ringkasan, lalu `__bf.download()` → `wa-export-*.json` (atau `__bf.copy()`).

Script hanya MEMBACA layar. Ia mengetik di kolom search dan mengklik hasil, tidak pernah menekan kirim.

## 2. Impor ke CRM
Serahkan file JSON ke Claude, atau jalankan sendiri:
```
node import-wa-export.mjs wa-export-XXXX.json            # laporan + wa-export-XXXX.backfill.sql
scp -i VPS_DW/DWSSH.pem wa-export-XXXX.backfill.sql DzakiWismadi@103.93.162.31:/tmp/backfill.sql
# DRY RUN (di-ROLLBACK, hanya melaporkan jumlah):
ssh -i VPS_DW/DWSSH.pem DzakiWismadi@103.93.162.31 "docker exec -i mapping-db-1 psql -U sahaibat sahaibat_mapping -v ON_ERROR_STOP=1 < /tmp/backfill.sql"
# SIMPAN (COMMIT):
ssh ... "docker exec -i mapping-db-1 psql -U sahaibat sahaibat_mapping -v ON_ERROR_STOP=1 -v apply=1 < /tmp/backfill.sql"
```
- Idempotent (`ON CONFLICT (wa_message_id) DO NOTHING`); aman dijalankan ulang.
- Pengaman: kalau ada ≥5 pesan di zona tumpang-tindih (≤ pesan terakhir yang sudah di CRM) tapi **0 ID cocok**, transaksi dibatalkan.
- Chat yang tidak terverifikasi (`verified: none/manual`) dilewati; pakai `--accept-manual` setelah memeriksa `headerTitle`.
- Pesan baru juga dicatat di `lead_activities` (`wa_message_sent/received`, `created_at` = waktu pesan).

## Batas yang perlu diketahui
- Waktu pesan dari WA Web hanya sampai **menit**; detik dibuat berurutan agar urutan chat benar. Media tanpa caption dapat `approxTime`.
- Isi media (gambar/PDF/audio) tidak diambil, hanya jenisnya (`image/document/audio/…`) dan caption.
- Script ini belum pernah diuji pada DOM WA Web asli (disusun tanpa membuka akun). Bila `diagnose()` menunjukkan selector
  tidak cocok, kirim hasilnya ke Claude untuk disesuaikan.
- Lead yang membalas **hari ini** tetapi tidak ada di daftar target (tidak ada pesan tercatat sejak 13 Okt) tidak ikut;
  tambahkan lewat `__bf.add("+62…","Nama")` sebelum `run()`.
