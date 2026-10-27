-- sync_daily_summaries pelengkap 5 & 11 Okt (3 rows)
BEGIN;
INSERT INTO sync_daily_summaries (lead_id, date, summary) VALUES
  ('f7cd46f4-620a-4645-a49c-9cc260a46afe', '2026-10-05', $q$Membenarkan bahwa ini nomor klinik PKU Muhammadiyah Cawas dan menanyakan keperluan kami. Belum ada pembicaraan lanjutan.$q$),
  ('ee3a268f-deba-4e68-a482-0358e65f2399', '2026-10-11', $q$Mengusulkan wawancara via Zoom/Gmeet malam ini sekitar jam 20.00; di hari kerja dokter belum bisa.$q$),
  ('04b0930c-8cbb-41b7-ba98-fd835ad1c04c', '2026-10-11', $q$Chat uji coba pada kontak "Testing" (bukan lead sungguhan).$q$)
ON CONFLICT (lead_id, date) DO NOTHING;
COMMIT;
SELECT date, count(*) FROM sync_daily_summaries WHERE date BETWEEN '2026-10-05' AND '2026-10-11' GROUP BY date ORDER BY date;
