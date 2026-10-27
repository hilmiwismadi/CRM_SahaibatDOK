-- sync_daily_summaries 2026-10-18 (1 rows)
BEGIN;
INSERT INTO sync_daily_summaries (lead_id, date, summary) VALUES
  ('45478cb8-ef44-4f2f-931f-27dfbc003824', '2026-10-18', $q$Sore hari mengirim data untuk pembuatan akun (email klinik serta email dan nomor dua staf; tidak dicatat di sini).$q$)
ON CONFLICT (lead_id, date) DO NOTHING;
COMMIT;
SELECT count(*) AS rows_for_date FROM sync_daily_summaries WHERE date='2026-10-18';
