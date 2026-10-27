-- Lengkapi lead_appointments dengan demo dari daftar user (21 Okt) yang belum tercatat.
-- Jam diambil dari chat; visit = kunjungan tatap muka. Aman diulang (lewati bila lead sudah punya janji di hari yang sama).
BEGIN;

WITH v(prefix, wib, kind, note) AS (VALUES
  ('57721b93', '2026-09-09 19:00', 'visit',      'Demo daftar user: kunjungan ke tempat praktik dr Donytra (chat 8-9 Sep)'),
  ('6bc696e9', '2026-09-10 19:30', 'visit',      'Demo daftar user: kunjungan ke klinik, bertemu drg Andi (chat 10 Sep)'),
  ('a9f52065', '2026-09-14 13:00', 'visit',      'Demo daftar user: pertemuan di Klinik Utama Adera (chat 11-14 Sep)'),
  ('ee3a268f', '2026-09-17 16:00', 'demo_gmeet', 'Demo daftar user: online meeting pertama (chat 16-17 Sep, link dikirim ke nomor pribadi dokter)'),
  ('a16a15d8', '2026-09-21 16:45', 'demo_gmeet', 'Demo daftar user: online dengan Mbak Ina (chat 21 Sep)'),
  ('cd4bb0f5', '2026-09-22 12:45', 'demo_gmeet', 'Demo daftar user: online, dokter minta saat itu juga (chat 22 Sep)'),
  ('5b689a68', '2026-09-24 14:00', 'demo_gmeet', 'Demo daftar user: demo pertama (jam tidak diketahui dari chat)'),
  ('30ea9a94', '2026-09-28 09:00', 'demo_gmeet', 'Demo daftar user: wawancara Senin 09.00 (disepakati di chat 25 Sep)'),
  ('11aeee81', '2026-10-13 10:00', 'demo_gmeet', 'Demo daftar user: Gmeet dengan admin (12 Okt gagal, diulang 13 Okt)'),
  ('99219dcc', '2026-10-17 12:45', 'demo_gmeet', 'Demo daftar user: Gmeet dr Fery / Arrayan (satu manajemen); sempat kendala akses link')
), m AS (
  SELECT l.id AS lead_id, ((v.wib::timestamp AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'UTC') AS starts_at, v.kind, v.note
  FROM v JOIN leads l ON l.id::text LIKE v.prefix || '%'
)
INSERT INTO lead_appointments (lead_id, kind, starts_at, duration_min, note, status, updated_at)
SELECT m.lead_id, m.kind, m.starts_at, 60, m.note, 'done', now()
FROM m
WHERE NOT EXISTS (
  SELECT 1 FROM lead_appointments a
  WHERE a.lead_id = m.lead_id
    AND (a.starts_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date = (m.starts_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date
);

-- Hasil: jumlah lead yang pernah demo (Gmeet atau kunjungan, sudah lewat, tidak batal). Harus 20.
SELECT count(DISTINCT lead_id) AS lead_demo,
       count(*) FILTER (WHERE kind = 'demo_gmeet') AS gmeet,
       count(*) FILTER (WHERE kind = 'visit') AS kunjungan
FROM lead_appointments
WHERE kind IN ('demo_gmeet', 'visit') AND status <> 'cancelled' AND starts_at <= now() AT TIME ZONE 'UTC';
COMMIT;
