-- sync_daily_summaries 2026-10-24 (6 rows)
BEGIN;
INSERT INTO sync_daily_summaries (lead_id, date, summary) VALUES
  ('a314ed44-b50b-481b-96bc-9e289cfc7b28', '2026-10-24', $q$Nomor dikonfirmasi benar; setelah perkenalan riset, admin akan menyampaikan ke administrasi/dokter dan menanyakan proposal program.$q$),
  ('3b48146f-8c86-4a8d-b86b-9481b2c22256', '2026-10-24', $q$Klinik meneruskan maksud, tujuan, dan surat kami ke manajemen; dijanjikan kabar paling lambat besok siang.$q$),
  ('8dbdaed2-fdc5-4c5f-91cd-6ddfd3b18b71', '2026-10-24', $q$Admin membalas menanyakan apa yang bisa dibantu. Perlu dilanjutkan dengan perkenalan riset.$q$),
  ('f0e9394b-bfc1-44f3-aec8-52877ac48410', '2026-10-24', $q$Admin: dokter sedang seminar di luar kota, belum bisa dijadwalkan.$q$),
  ('ba8de637-383a-4461-9879-fcd50d7dac1c', '2026-10-24', $q$Dokter bersedia; Gmeet singkat (±15 menit perkenalan) diagendakan jam 13.30 dan link dikirim, dokter mengonfirmasi 'ok'.$q$),
  ('2f856686-7f1f-4c46-8c6a-d2b6fb3bb81a', '2026-10-24', $q$Klinik menjawab bentuk praktiknya klinik bersalin.$q$)
ON CONFLICT (lead_id, date) DO NOTHING;
COMMIT;
SELECT count(*) AS rows_for_date FROM sync_daily_summaries WHERE date='2026-10-24';
