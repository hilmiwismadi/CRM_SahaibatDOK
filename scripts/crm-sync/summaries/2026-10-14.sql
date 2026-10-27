-- sync_daily_summaries 2026-10-14 (8 rows)
BEGIN;
INSERT INTO sync_daily_summaries (lead_id, date, summary) VALUES
  ('99219dcc-159d-4dc8-a65b-3ce49866b3c4', '2026-10-14', $q$Kami follow-up menanyakan kembali; dijawab "sebentar mohon ditunggu" dan kami balas "baik". Ada satu pesan masuk tanpa teks sore hari.$q$),
  ('6959b912-b83c-42f3-9495-b55a5394c0ee', '2026-10-14', $q$Malam hari membalas "Baik sama sama"; tidak ada isi lain tercatat hari ini.$q$),
  ('75098af3-c349-4990-8cb1-7d0628893609', '2026-10-14', $q$Staf admin bersedia diwawancara dulu, tetapi dr Samsul (owner, praktik sore 16.00-20.00) belum bisa sesi tanya jawab dan belum ada waktu. Atas pertanyaan kami, klinik sudah memakai rekam medis digital berbasis web (nama sistem belum diketahui); mereka juga menanyakan apakah wawancara untuk tugas akhir atau keperluan lain.$q$),
  ('9a8dded2-5c4b-491d-8b01-588af73ec5f2', '2026-10-14', $q$Kami minta maaf baru membalas (HP error) lalu mengirim perkenalan riset; mereka membalas "tidak apa-apa". Belum ada jawaban atas perkenalan riset.$q$),
  ('ddf157bd-6ae4-4d61-b81d-c9173ef784f7', '2026-10-14', $q$Mereka menanyakan asal instansi dan tujuan riset (apakah di bawah dinkes/BPJS); setelah kami jelaskan Sahaibat, mereka bersedia membantu menjawab. Kami tawarkan sesi online Kamis (15 Okt); jawaban: belum bisa memastikan, akan dikabari besok.$q$),
  ('5b689a68-00d6-420a-aefa-7d7997572fbc', '2026-10-14', $q$Menyatakan penggunaan aman, tidak ada kesulitan. Untuk melanjutkan integrasi kami minta data dokter; mereka mengirim data dr. Suriadie (nama, STR, tempat praktik, WhatsApp) dan kami kirim ulang data tersebut.$q$),
  ('d3fad0d8-321d-4686-86d3-c1302e75e1cd', '2026-10-14', $q$Pagi hari hanya membalas "njih"; belum ada jawaban pimpinan soal kesediaan jadi narasumber.$q$),
  ('11aeee81-5d06-4f32-88fe-ee4f59511bfa', '2026-10-14', $q$Kami menanyakan respon dr Daniel; admin sedang libur, dan sampai 15.20 belum ada respon dari dokter.$q$)
ON CONFLICT (lead_id, date) DO NOTHING;
COMMIT;
SELECT count(*) AS rows_for_date FROM sync_daily_summaries WHERE date='2026-10-14';
