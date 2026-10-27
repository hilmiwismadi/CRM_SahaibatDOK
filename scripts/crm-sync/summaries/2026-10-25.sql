-- sync_daily_summaries 2026-10-25 (3 rows)
BEGIN;
INSERT INTO sync_daily_summaries (lead_id, date, summary) VALUES
  ('df4d59d7-de59-4bbc-93a3-7b09bcc13e80', '2026-10-25', $q$Dokter minta presentasi Senin 26 Okt diundur ke jam 11.00 karena ada pasien pagi; kami setujui.$q$),
  ('aba1a0be-5706-422a-9adc-eadb603812b1', '2026-10-25', $q$Klinik minta link Zoom untuk Rabu atau Kamis pagi; kami akan kirim linknya.$q$),
  ('11819651-9df1-405b-aea8-e2104e7c4d9f', '2026-10-25', $q$Wawancara online jam 10.00 dikonfirmasi; klinik sudah siap dan link Meet dikirim 09.58.$q$)
ON CONFLICT (lead_id, date) DO NOTHING;
COMMIT;
SELECT count(*) AS rows_for_date FROM sync_daily_summaries WHERE date='2026-10-25';
