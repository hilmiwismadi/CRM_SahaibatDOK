-- sync_daily_summaries 2026-10-07 (16 rows)
BEGIN;
INSERT INTO sync_daily_summaries (lead_id, date, summary) VALUES
  ('2a540786-8388-478a-a649-2d913a2ab179', '2026-10-07', $q$Nomor dikonfirmasi benar; pitch riset terkirim. Dibalas: jadwal sedang padat, akan mengabari kembali.$q$),
  ('1ca6ad55-4f95-4502-8dd4-3e782b3135ea', '2026-10-07', $q$Setelah follow-up, klinik menjadwalkan diskusi Kamis pukul 10.00 (tatap muka atau daring). Kami pilih daring dan akan kirim link GMeet besok pagi pukul 09.30.$q$),
  ('ecec52c4-376d-442d-98c9-2be03cf12497', '2026-10-07', $q$Nomor dikonfirmasi benar; pitch riset terkirim. Belum ada balasan.$q$),
  ('4a122c81-a560-4488-af63-a06132e18db3', '2026-10-07', $q$Dijawab admin (menanyakan ada yang bisa dibantu); pitch riset terkirim. Belum ada balasan.$q$),
  ('26df8de3-f28c-4f37-8cb0-9df2aa0fb5b2', '2026-10-07', $q$Kontak admin klinik menanyakan peruntukan riset; kami jelaskan latar startup SahAIbat dan program kolaborasi FKTP. Belum ada balasan.$q$),
  ('5b689a68-00d6-420a-aefa-7d7997572fbc', '2026-10-07', $q$Klinik membagikan contoh export data dari aplikasinya (jumlah per jenis penyakit untuk puskesmas, dan data nama+alamat pasien untuk kasus prioritas seperti hipertensi) sebagai gambaran kebutuhan pelaporan.$q$),
  ('e7178a0f-0468-4d8e-91ca-261d5a49a2de', '2026-10-07', $q$Jadwal bidan Yulia padat; klinik mengusulkan sekitar tanggal 20 dan kami setujui. Kami akan chat ulang tanggal 19 sebagai pengingat.$q$),
  ('3b48146f-8c86-4a8d-b86b-9481b2c22256', '2026-10-07', $q$Surat dari kampus sudah dikirim; klinik membalas 'ditunggu'. Kami minta dikabari jika ada informasi terbaru.$q$),
  ('d3fad0d8-321d-4686-86d3-c1302e75e1cd', '2026-10-07', $q$Dijawab humas klinik (auto-reply lalu admin menanyakan ada yang bisa dibantu); pitch riset terkirim. Belum ada balasan.$q$),
  ('46f96fcf-89c6-43ed-a229-0c812344c3b6', '2026-10-07', $q$Dijawab admin Klinik Utama Asri Medika (pendaftaran dilayani langsung); pitch riset terkirim. Belum ada balasan.$q$),
  ('7d3945fb-050d-4bf7-a20d-49f4c1c4f23c', '2026-10-07', $q$Admin menanyakan ke owner; klinik meminta surat resmi terlebih dahulu. Kami akan menyiapkan persuratannya.$q$),
  ('ba8de637-383a-4461-9879-fcd50d7dac1c', '2026-10-07', $q$Dokter bisa ditemui sore ini setelah selesai praktik; kami menanyakan jam pastinya, belum dibalas.$q$),
  ('05482f63-2a0d-40d3-8efe-222534c3a245', '2026-10-07', $q$Nomor ternyata Rhea Mom Baby Healthcare & Spa (auto-reply reservasi), lalu dikonfirmasi admin. Pitch riset terkirim, belum ada balasan.$q$),
  ('d4d35f26-40d4-43e1-b8c3-2b2a659f59fc', '2026-10-07', $q$Salam dan pitch riset terkirim. Belum ada balasan.$q$),
  ('2a66a1ab-92d4-46f6-9062-f2726d027a39', '2026-10-07', $q$Dokter tidak praktik di sana (dr. Faris sedang studi di Jepang). Kami tawarkan wawancara dengan staf administrasi dan menjelaskan latar startup setelah ditanya asal kami. Belum ada jawaban akhir.$q$),
  ('b49b90d2-c967-405d-a08e-37bd2258b30e', '2026-10-07', $q$Nomor dijawab auto-reply Ellena Skin Care dan dinyatakan bukan nomor dr. Muki. Perlu cari nomor lain.$q$)
ON CONFLICT (lead_id, date) DO NOTHING;
COMMIT;
SELECT count(*) AS rows_for_date FROM sync_daily_summaries WHERE date='2026-10-07';
