-- sync_daily_summaries 2026-10-08 (6 rows)
BEGIN;
INSERT INTO sync_daily_summaries (lead_id, date, summary) VALUES
  ('1ca6ad55-4f95-4502-8dd4-3e782b3135ea', '2026-10-08', $q$Wawancara via Gmeet jam 10.00: klinik menunggu link, link sudah kami kirim pagi dan klinik membalas terima kasih.$q$),
  ('5b689a68-00d6-420a-aefa-7d7997572fbc', '2026-10-08', $q$Klinik menarik data yang dikirim kemarin karena ada identitas yang belum dianonimkan dan meminta dihapus; tidak ada kendala lain dari sistem.$q$),
  ('d3fad0d8-321d-4686-86d3-c1302e75e1cd', '2026-10-08', $q$Menanyakan apakah ini menjadi narasumber online; minta bersurat ke Direktur Klinik Pratama UNIMUS dan menyebutkan petugas yang diharapkan. Surat akan kami siapkan.$q$),
  ('ba8de637-383a-4461-9879-fcd50d7dac1c', '2026-10-08', $q$Wawancara via Gmeet jam 13.30 (link dikirim). Setelah itu kami tawarkan akun khusus praktik mandiri dan meminta email; dokter setuju dan akan mengirim emailnya.$q$),
  ('05482f63-2a0d-40d3-8efe-222534c3a245', '2026-10-08', $q$Admin akan konfirmasi ke dokter terlebih dahulu; kami menunggu kabar.$q$),
  ('45478cb8-ef44-4f2f-931f-27dfbc003824', '2026-10-08', $q$Setuju diajak online meeting minggu depan; disepakati Rabu 14 Oktober jam 12.30.$q$)
ON CONFLICT (lead_id, date) DO NOTHING;
COMMIT;
SELECT count(*) AS rows_for_date FROM sync_daily_summaries WHERE date='2026-10-08';
