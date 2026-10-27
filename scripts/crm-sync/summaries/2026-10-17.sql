-- sync_daily_summaries 2026-10-17 (3 rows)
BEGIN;
INSERT INTO sync_daily_summaries (lead_id, date, summary) VALUES
  ('99219dcc-159d-4dc8-a65b-3ce49866b3c4', '2026-10-17', $q$Sesi jam 12 sempat batal karena dokter mendadak berhalangan (dokter hanya datang Sabtu/Minggu dan jamnya tidak menentu). Siang hari dokter ternyata hadir dan wawancara online via Google Meet dimulai; sempat kendala akses link sehingga kami beri akses, namun dokter belum bisa masuk dan staf menyarankan menghubungi pak Neo langsung.$q$),
  ('45478cb8-ef44-4f2f-931f-27dfbc003824', '2026-10-17', $q$Kami meminta data untuk pembuatan akun di sistem (email klinik, email dan nomor staf); mereka menjawab "baik bu".$q$),
  ('ee3a268f-deba-4e68-a482-0358e65f2399', '2026-10-17', $q$Dokter konfirmasi bisa jam 10; kami kirim link Google Meet. Sempat tertunda karena mati listrik/wifi, lalu sesi berjalan dan dokter minta diperpanjang sampai jam 11 (disetujui), diakhiri dengan "makasih".$q$)
ON CONFLICT (lead_id, date) DO NOTHING;
COMMIT;
SELECT count(*) AS rows_for_date FROM sync_daily_summaries WHERE date='2026-10-17';
