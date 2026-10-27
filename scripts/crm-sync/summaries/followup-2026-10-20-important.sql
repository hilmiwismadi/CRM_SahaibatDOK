-- Seed untuk fitur notes berpoin + halaman /reports/important (dibuat sesi Claude 2026-10-20).
-- Jalankan SETELAH migrasi 20261020120000_followup_notes_important.
-- Aman dijalankan ulang: appointment dilewati bila lead sudah punya janji di hari yang sama,
-- notes hanya diisi bila masih kosong, baris penting memakai ON CONFLICT DO UPDATE.
BEGIN;

-- 1) Saran lama (action) menjadi poin pertama di daftar catatan.
UPDATE followup_triage
SET notes = jsonb_build_array(jsonb_build_object('id', gen_random_uuid()::text, 'text', action, 'done', false))
WHERE action IS NOT NULL AND btrim(action) <> '' AND notes = '[]'::jsonb;

-- 2) Gmeet yang sudah berjalan / terjadwal, direkonstruksi dari chat (link Meet dikirim). Jam = perkiraan dari chat.
WITH v(prefix, wib, status) AS (VALUES
  ('cf4bc7d8', '2026-09-11 19:00', 'done'),
  ('b3dd24ac', '2026-10-01 11:00', 'done'),
  ('1ca6ad55', '2026-10-08 10:00', 'done'),
  ('fa1f86f1', '2026-10-16 08:30', 'done'),
  ('5b689a68', '2026-10-19 13:00', 'done'),
  ('e7178a0f', '2026-09-16 17:00', 'done'),
  ('e7178a0f', '2026-10-20 15:30', 'scheduled'),
  ('ba8de637', '2026-10-08 13:30', 'done'),
  ('2f856686', '2026-10-20 13:00', 'done'),
  ('cdac41e5', '2026-10-05 08:30', 'done'),
  ('45478cb8', '2026-10-06 12:00', 'done'),
  ('45478cb8', '2026-10-16 14:00', 'done'),
  ('fdda4292', '2026-10-02 15:15', 'done'),
  ('ee3a268f', '2026-10-17 10:00', 'done'),
  ('04e82c65', '2026-10-21 08:00', 'scheduled')
), m AS (
  SELECT l.id AS lead_id, ((v.wib::timestamp AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'UTC') AS starts_at, v.status
  FROM v JOIN leads l ON l.id::text LIKE v.prefix || '%'
)
INSERT INTO lead_appointments (lead_id, kind, starts_at, duration_min, note, status, updated_at)
SELECT m.lead_id, 'demo_gmeet', m.starts_at, 60, 'Diisi dari riwayat chat (jam perkiraan)', m.status, now()
FROM m
WHERE NOT EXISTS (
  SELECT 1 FROM lead_appointments a
  WHERE a.lead_id = m.lead_id
    AND (a.starts_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date = (m.starts_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date
);

-- 3) Lead Utama (setelah demo ada lanjutan) dan Post Gmeet yang alasannya sudah diketahui.
WITH v(prefix, section, stage, status_text, reason, notes) AS (VALUES
  ('ee3a268f', 'main', 'Trial aktif',
   'Sudah diberikan akses trial dan mencoba. Gmeet mengajari sistem sudah dilakukan (17 Okt), tapi belum dipakai secara aktif.', NULL,
   '["Pantau apakah sudah mulai dipakai untuk pasien","Tanyakan kendala atau kebutuhan bantuan setelah Gmeet 17 Okt"]'),
  ('5b689a68', 'main', 'Trial aktif',
   'Sudah diberikan akses trial dan mencoba. Gmeet mengajari sistem sudah dilakukan (19 Okt), tapi belum aktif dipakai; data perlu direset. MoU dan skema berbayar sudah dikirim, belum ditanggapi.', NULL,
   '["Bantu reset dan input ulang data klinik","Tunggu tanggapan MoU dan skema berbayar"]'),
  ('45478cb8', 'main', 'Persiapan akun trial',
   'Gmeet pertama (6 Okt) dan kedua (16 Okt) sudah; mendapat informasi akun yang mau dicoba. Akun sudah ada, namun perlu setup Gmeet agar bisa mengajari tim bidan.', NULL,
   '["Jadwalkan Gmeet pengajaran sistem untuk tim bidan","Pastikan akun staf sudah dibuat"]'),
  ('ba8de637', 'main', 'Persiapan akun trial',
   'Gmeet pertama (8 Okt); sudah berkenan memberi detail. Akun Dok dikirim 20 Okt, namun belum ada respon untuk Gmeet pengajaran sistem di awal.', NULL,
   '["Tawarkan jadwal Gmeet pengajaran sistem","Jawab pertanyaan soal assist.id"]'),
  ('cdac41e5', 'main', 'Permintaan detail setup akun',
   'Gmeet pertama (5 Okt); tertarik dengan Dok Companion. Sudah di-follow up untuk detail email dll (15 Okt) namun belum dijawab.', NULL,
   '["Follow up detail email dan data untuk setup akun"]'),
  ('b3dd24ac', 'post_gmeet', NULL, NULL, 'Sudah memakai sistem vendor offline (router).', NULL),
  ('cf4bc7d8', 'post_gmeet', NULL, NULL, 'Pengembang sistem rekam medis mereka (Sisfomedika) kurang berkenan saat dikontak.', NULL)
), m AS (
  SELECT l.id AS lead_id, v.* FROM v JOIN leads l ON l.id::text LIKE v.prefix || '%'
)
INSERT INTO followup_triage (lead_id, priority, status, source, triaged_on, important_section, important_stage, important_status, no_follow_reason, notes)
SELECT lead_id, 'positive', 'open', 'claude', '2026-10-20', section, stage, status_text, reason,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('id', gen_random_uuid()::text, 'text', t, 'done', false))
                 FROM jsonb_array_elements_text(m.notes::jsonb) AS t), '[]'::jsonb)
FROM m
ON CONFLICT (lead_id) DO UPDATE SET
  important_section = EXCLUDED.important_section,
  important_stage   = COALESCE(EXCLUDED.important_stage, followup_triage.important_stage),
  important_status  = COALESCE(EXCLUDED.important_status, followup_triage.important_status),
  no_follow_reason  = COALESCE(EXCLUDED.no_follow_reason, followup_triage.no_follow_reason),
  notes = CASE WHEN EXCLUDED.notes <> '[]'::jsonb THEN EXCLUDED.notes ELSE followup_triage.notes END,
  updated_at = now();

SELECT important_section, count(*) FROM followup_triage WHERE important_section IS NOT NULL GROUP BY 1;
SELECT count(*) AS appointments FROM lead_appointments;
COMMIT;
