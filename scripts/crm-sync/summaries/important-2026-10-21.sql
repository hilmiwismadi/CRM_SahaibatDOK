-- /reports/important: tahap + status lead Utama sesuai arahan user 2026-10-21 (tanggal dari lead_appointments / chat).
-- Jalankan SETELAH migrasi 20261021120000_followup_note_logs. Aman diulang. Pengingat (notes) tidak disentuh.
BEGIN;

WITH v(prefix, stage, status_text) AS (VALUES
  ('ee3a268f', 'Sudah diberikan akses trial dan mencoba',
   'Terakhir sudah Gmeet mengajari sistem pada 17 Okt, tapi masih belum dipakai secara aktif.'),
  ('5b689a68', 'Sudah diberikan akses trial dan mencoba',
   'Terakhir sudah Gmeet mengajari sistem pada 19 Okt, tapi masih belum dipakai secara aktif. MoU sudah diberikan dan sedang direview; mereka request input Excel inventori.'),
  ('45478cb8', 'Persiapan akun trial',
   'Gmeet pertama 6 Okt, lalu Gmeet kedua 16 Okt dan mendapat informasi akun yang mau dicoba. Akun sudah ada, namun perlu setup Gmeet agar bisa mengajari tim bidan (chat 20 Okt: setuju 21 Okt jam 13.00).'),
  ('e7178a0f', 'Persiapan akun trial',
   'Gmeet pertama dengan Bu Yulia (owner) 16 Sep; Gmeet kedua dengan Kak Rara (bidan) 20 Okt, 1,5 jam dan interaktif, menjawab sistem secara detail. Perlu siapkan …'),
  ('ba8de637', 'Persiapan akun trial',
   'Gmeet pertama 8 Okt; sudah berkenan memberi detail. Akun Dok sudah dikirim 20 Okt, namun belum ada respon untuk Gmeet pengajaran sistem di awal.'),
  ('cdac41e5', 'Permintaan detail untuk setup akun',
   'Gmeet pertama 5 Okt dan tertarik dengan Dok Companion. Sudah di-follow up untuk detail email dll, namun belum dijawab.'),
  ('2f856686', 'Persiapan akun trial',
   'Setelah Gmeet 20 Okt tertarik; sudah propose paket setahun, sedang membutuhkan detail untuk persiapan akun.')
), m AS (
  SELECT l.id AS lead_id, v.* FROM v JOIN leads l ON l.id::text LIKE v.prefix || '%'
)
INSERT INTO followup_triage (lead_id, priority, status, source, triaged_on, important_section, important_stage, important_status)
SELECT lead_id, 'positive', 'open', 'claude', '2026-10-21', 'main', stage, status_text FROM m
ON CONFLICT (lead_id) DO UPDATE SET
  important_section = 'main',
  important_stage   = EXCLUDED.important_stage,
  important_status  = EXCLUDED.important_status,
  updated_at = now();

-- D'Maryam: Gmeet kedua 20 Okt sudah berlangsung (jam 16.00 sesuai chat, ±1,5 jam).
UPDATE lead_appointments
SET status = 'done',
    starts_at = (('2026-10-20 16:00'::timestamp AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'UTC'),
    duration_min = 90,
    updated_at = now()
WHERE lead_id::text LIKE 'e7178a0f%' AND kind = 'demo_gmeet'
  AND (starts_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date = '2026-10-20';

-- Bidan Siti Maryam: Gmeet pengajaran tim bidan disepakati 21 Okt jam 13.00 (chat 20 Okt).
INSERT INTO lead_appointments (lead_id, kind, starts_at, duration_min, note, status, updated_at)
SELECT l.id, 'demo_gmeet', (('2026-10-21 13:00'::timestamp AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'UTC'), 60,
       'Gmeet pengajaran sistem untuk tim bidan (disepakati di chat 20 Okt)', 'scheduled', now()
FROM leads l
WHERE l.id::text LIKE '45478cb8%'
  AND NOT EXISTS (
    SELECT 1 FROM lead_appointments a
    WHERE a.lead_id = l.id
      AND (a.starts_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date = '2026-10-21');

SELECT l.name, t.important_stage FROM followup_triage t JOIN leads l ON l.id = t.lead_id WHERE t.important_section = 'main' ORDER BY 1;
COMMIT;
