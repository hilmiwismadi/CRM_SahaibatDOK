-- sync_daily_summaries 2026-10-03 (1 rows)
BEGIN;
INSERT INTO sync_daily_summaries (lead_id, date, summary) VALUES
  ('3b48146f-8c86-4a8d-b86b-9481b2c22256', '2026-10-03', $q$Meminta dikirimi surat dari kampus dulu untuk disampaikan ke manajemen.$q$)
ON CONFLICT (lead_id, date) DO NOTHING;
COMMIT;
SELECT count(*) AS rows_for_date FROM sync_daily_summaries WHERE date='2026-10-03';
