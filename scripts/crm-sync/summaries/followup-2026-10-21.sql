-- Triase Follow Up lanjutan, 21 Okt 2026 (sesi Claude): lead baru 20-21 Okt + perubahan status dari balasan terbaru.
-- Aman dijalankan ulang: insert memakai ON CONFLICT DO NOTHING; update hanya menyentuh baris source='claude'.
BEGIN;

-- 1) Lead baru yang belum punya baris triase.
WITH v(prefix, priority, action) AS (VALUES
  ('2edaf275','try','Pitch terkirim 21 Okt, belum dibalas. Coba nudge sekali lagi besok.'),
  ('fba5cba6','try','Pitch terkirim 21 Okt, belum dibalas. Coba nudge sekali lagi besok.'),
  ('5003e80d','try','Pitch terkirim 21 Okt setelah konfirmasi nomor, belum dibalas.'),
  ('a314ed44','try','Baru dibuka 21 Okt, belum ada balasan sama sekali.'),
  ('c6580b84','try','Pitch 20 Okt sore, belum dibalas. Nudge sekali lagi.'),
  ('d0c7b56a','try','Diminta perkenalan diri, pitch sudah terkirim 21 Okt. Tunggu balasan.'),
  ('7b74c92f','try','Pitch 20 Okt malam, belum dibalas. Nudge sekali lagi.'),
  ('54d096d0','closed','Salah nomor (toko bahan bangunan).'),
  ('242e2ded','try','Pitch terkirim 21 Okt, belum dibalas.'),
  ('2f5a08f3','try','Pitch terkirim 21 Okt, belum dibalas.'),
  ('1006ad47','try','Pitch terkirim 21 Okt, belum dibalas.'),
  ('eae5caad','warm','Admin akan menyampaikan ke dokter (21 Okt). Tanyakan kabarnya besok.'),
  ('263ae593','try','Pitch terkirim 21 Okt, belum dibalas.'),
  ('7885f15f','try','Pitch terkirim 21 Okt, belum dibalas.'),
  ('bc2171c1','try','Pitch terkirim 21 Okt pagi, belum dibalas.'),
  ('e504beca','warm','Akan dikabari klinik (20 Okt). Tanyakan kabarnya dalam 2-3 hari.'),
  ('0f5ec840','try','Pitch terkirim 21 Okt, belum dibalas.'),
  ('728ba897','try','Baru dibuka 21 Okt, belum ada balasan.'),
  ('9993cae6','try','Pitch terkirim 21 Okt, belum dibalas.'),
  ('c5665c76','warm','Bidan sedang padat, belum bisa membantu. Pertanyaan soal rekam medis belum dijawab; jangan didesak.'),
  ('048085a4','warm','Admin akan membantu (21 Okt). Tanyakan siapa dan kapan bisa dihubungi.'),
  ('6df088f6','hot','Bersedia diwawancarai (pencatatan masih manual, TPMB). Tunggu jam yang cocok untuk besok, lalu kirim link Meet.'),
  ('9ab695dc','try','Pitch terkirim 21 Okt, belum dibalas.'),
  ('0773daf0','try','Pitch terkirim 21 Okt pagi, belum dibalas.'),
  ('f314c13b','try','Pitch terkirim 21 Okt, belum dibalas.'),
  ('42df36bc','try','Baru dibuka 21 Okt, belum ada balasan.'),
  ('0aaca072','try','Pitch terkirim 21 Okt, belum dibalas.'),
  ('03f40e28','warm','Awalnya belum berkenan, tapi menjawab ERM. Tunggu jawaban nama ERM; jangan didesak.'),
  ('4df4ff67','try','Pitch 20 Okt sore, belum dibalas. Nudge sekali lagi.'),
  ('81638a08','warm','Menanyakan biaya (insentif); sudah dijelaskan belum ada insentif. Tunggu tanggapan.')
), m AS (
  SELECT l.id AS lead_id, v.priority, v.action FROM v JOIN leads l ON l.id::text LIKE v.prefix || '%'
)
INSERT INTO followup_triage (lead_id, priority, action, status, source, triaged_on, notes)
SELECT lead_id, priority, action, 'open', 'claude', '2026-10-21',
       jsonb_build_array(jsonb_build_object('id', gen_random_uuid()::text, 'text', action, 'done', false))
FROM m
ON CONFLICT (lead_id) DO NOTHING;

-- 2) Perubahan status lead lama (hanya yang belum diedit manual). Poin baru ditambahkan di akhir catatan.
WITH v(prefix, priority, due, note) AS (VALUES
  ('fcd5b660','closed',NULL,'Menjawab "Maaf saya tidak" (20 Okt). Tutup.'),
  ('12af5002','hot',NULL,'Klinik membalas 20 Okt malam dengan jawaban PJ Klinik (lampiran). Baca lampirannya dan balas.'),
  ('60db10ad','warm',NULL,'Surat pengajuan sudah dikirim dan dijawab "baik" (20 Okt). Tunggu kabar.'),
  ('5b689a68','warm',NULL,'21 Okt: data baru dikirim bulan depan, bersamaan jadwal stok opname. Ingatkan awal November.'),
  ('e7178a0f','hot',NULL,'21 Okt: klinik mulai mengisi sistem ("Coba saya isi ya"). Pantau kendala.'),
  ('04e82c65','hot','2026-10-22','21 Okt: agenda ditunda besok (22 Okt). Sudah pakai ERM eclinic. Tanyakan jam dan pastikan manajer RM hadir.'),
  ('7d3945fb','hot',NULL,'21 Okt: diminta langsung WA Pak Tri (kontak ada di chat). Hubungi beliau.'),
  ('d4d35f26','closed',NULL,'Dokter sudah tidak praktik (21 Okt).'),
  ('ba8de637','hot','2026-10-24','21 Okt: dokter melihat jadwal, mungkin Sabtu (24 Okt). Tanyakan lagi hari Sabtu.'),
  ('45478cb8','hot','2026-10-21','Gmeet pengajaran untuk tim bidan 21 Okt jam 13.00 (link terkirim). Setelahnya tanyakan hasil dan jadwal lanjutan.'),
  ('6f9ba1f3','warm',NULL,'Surat sudah diteruskan ke PIC klinik (20 Okt). Tunggu informasi.')
), m AS (
  SELECT l.id AS lead_id, v.priority, v.due, v.note FROM v JOIN leads l ON l.id::text LIKE v.prefix || '%'
)
UPDATE followup_triage t SET
  priority = m.priority,
  due_date = COALESCE(m.due, t.due_date),
  status = 'open',
  triaged_on = '2026-10-21',
  notes = t.notes || jsonb_build_array(jsonb_build_object('id', gen_random_uuid()::text, 'text', m.note, 'done', false)),
  updated_at = now()
FROM m WHERE t.lead_id = m.lead_id AND t.source = 'claude';

-- 3) Gmeet Widya Husada 21 Okt 08:00 ditunda; Gmeet Siti Maryam 21 Okt 13:00 (link terkirim).
UPDATE lead_appointments a SET status = 'cancelled', note = coalesce(note,'') || ' | Ditunda klinik ke 22 Okt', updated_at = now()
FROM leads l WHERE a.lead_id = l.id AND l.id::text LIKE '04e82c65%' AND a.status = 'scheduled';

INSERT INTO lead_appointments (lead_id, kind, starts_at, duration_min, note, status, updated_at)
SELECT l.id, 'demo_gmeet', ((timestamp '2026-10-21 13:00' AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'UTC'), 60, 'Diisi dari riwayat chat (jam perkiraan)', 'scheduled', now()
FROM leads l WHERE l.id::text LIKE '45478cb8%'
  AND NOT EXISTS (SELECT 1 FROM lead_appointments a WHERE a.lead_id = l.id
                  AND (a.starts_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date = '2026-10-21');

SELECT priority, count(*) FROM followup_triage WHERE triaged_on = '2026-10-21' GROUP BY 1 ORDER BY 1;
SELECT count(*) AS total_triase FROM followup_triage;
COMMIT;
