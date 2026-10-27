-- sync_daily_summaries 2026-10-10 (2 rows)
BEGIN;
INSERT INTO sync_daily_summaries (lead_id, date, summary) VALUES
  ('fb0c5be3-fb66-4b96-b8dd-eebebfd7e0b9', '2026-10-10', $q$Membenarkan nomor klinik ("Iya bener").$q$),
  ('11aeee81-5d06-4f32-88fe-ee4f59511bfa', '2026-10-10', $q$Dokter meminta kami mewakilkan ke admin; admin baru masuk Senin malam.$q$)
ON CONFLICT (lead_id, date) DO NOTHING;
COMMIT;
SELECT count(*) AS rows_for_date FROM sync_daily_summaries WHERE date='2026-10-10';
