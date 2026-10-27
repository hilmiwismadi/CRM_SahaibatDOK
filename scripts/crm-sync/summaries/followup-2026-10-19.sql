-- Triage follow-up untuk lead yang di-approach 2026-10-19 (dibuat sesi Claude).
-- Jalankan SETELAH migrasi 20261020000000_followup_triage diterapkan.
-- priority: hot | warm | try | closed. Dicocokkan dengan nama lead.
BEGIN;
INSERT INTO followup_triage (lead_id, priority, action, due_date, status, source, triaged_on)
SELECT l.id, v.priority, v.action, v.due_date, 'open', 'claude', '2026-10-19'
FROM (VALUES
 ('Praktek dr. Namira Farhayati Lubis','hot','Konfirmasi jam online meeting Rabu 21 Okt (beliau sudah bilang iya/oke)','2026-10-20'),
 ('Sakura Medika Premier Malang','hot','Tanya hasil izin ke dokter / bidan; tawarkan jadwal singkat','2026-10-20'),
 ('Praktek dr. Wahyu Purnomo dan dr. Emmi Wijayanti','warm','Surat riset sudah dikirim; tanya apakah sudah dibaca dan bersedia','2026-10-21'),
 ('Klinik Karisma','warm','Sudah dijelaskan dari startup Sahaibat; ingatkan dan tawarkan wawancara singkat','2026-10-21'),
 ('Dokter Esthi Setiadi','warm','Sudah dijelaskan perusahaan; tanya kesediaan dan jam praktik','2026-10-21'),
 ('Klinik Bunga Melati - JA Suprapto','try','Pitch ke HRD (Bu Rosa) belum dibalas; chat sekali lagi','2026-10-21'),
 ('Klinik BeSt Medika','try','Konfirmasi nomor Kak Rizka belum dibalas; chat sekali lagi','2026-10-21'),
 ('Praktek Dokter 24 Jam Amal Sehat','try','Nomor admin hanya auto-reply; coba klinik cabang / jam kerja','2026-10-22'),
 ('Aeternus. Praktek Mandiri dr. Bias Rahadian Surya, M.Biomed(AAM)','warm','"Nanti kami kabari" - ingatkan 2-3 hari lagi','2026-10-22'),
 ('dr. Surya Parlaungan Harahap, Sp. THT-BKL','try','Tidak ada balasan setelah pitch; coba sekali lagi','2026-10-22'),
 ('Praktik Dokter Samsul Arifin M.KKK','try','Tidak ada balasan setelah pitch; coba sekali lagi','2026-10-22'),
 ('Thursina Medical Clinic','try','Hanya auto-reply; coba sekali lagi di jam kerja','2026-10-22'),
 ('Praktik Dokter Mandiri KSU Mulyoagung','try','Konfirmasi nomor belum dibalas; coba sekali lagi','2026-10-22'),
 ('KLINIK YUDHA BHAKTI HUSADA','closed','Menolak untuk sementara','2026-10-19'),
 ('Shita Medical Clinic','closed','Sudah menjadi RS (FKRTL), di luar target klinik','2026-10-19')
) AS v(name, priority, action, due_date)
JOIN leads l ON l.name = v.name
ON CONFLICT (lead_id) DO UPDATE SET priority = EXCLUDED.priority, action = EXCLUDED.action,
  due_date = EXCLUDED.due_date, triaged_on = EXCLUDED.triaged_on, updated_at = now();
SELECT count(*) AS triage_rows FROM followup_triage;
COMMIT;
