-- sync_daily_summaries 2026-10-02 (20 rows)
BEGIN;
INSERT INTO sync_daily_summaries (lead_id, date, summary) VALUES
  ('f4bae983-6378-4358-81cd-19495265ddbc', '2026-10-02', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$),
  ('dd0e745c-eaa7-4dd4-a817-96de2db83f0d', '2026-10-02', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$),
  ('76ddf37b-e2c9-4ac9-8f69-8aba2626f3f4', '2026-10-02', $q$Nomor dikonfirmasi (ada balasan otomatis pendaftaran); pitch riset terkirim.$q$),
  ('1ee7ffb3-0cd1-4c4b-b872-04a15b74b8fa', '2026-10-02', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$),
  ('8f173ab2-9f9f-43ca-ad12-e3431a9cafe5', '2026-10-02', $q$Nomor dikonfirmasi; pitch terkirim. Diminta izin ke direktur klinik dengan proposal penelitian; surat akan kami siapkan. Dokter bisa ditemui saat jam praktik kecuali Kamis dan Minggu.$q$),
  ('8ec357f9-0a72-4bd6-a4c8-97dca24a9abf', '2026-10-02', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$),
  ('14c75c0f-2605-44cf-b3a6-117770282707', '2026-10-02', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$),
  ('12af5002-7545-4923-ba1d-034506fd9da0', '2026-10-02', $q$Follow-up: klinik meminta proposal riset untuk diajukan ke direktur. Surat akan kami siapkan.$q$),
  ('17a0798f-e8b3-46a1-9045-1a0fcb8aec9c', '2026-10-02', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$),
  ('cd5630fc-a235-429b-80bd-50c4e9a1e81d', '2026-10-02', $q$Nomor dikonfirmasi benar. Belum ada pitch hari ini.$q$),
  ('206e7c6d-2ee9-4753-bf58-e7f607fd1b34', '2026-10-02', $q$Hanya balasan otomatis lalu dibenarkan bahwa ini nomor admin klinik Intan Medika. Belum ada pitch.$q$),
  ('c0c97113-749d-4994-b07f-ce9e97590cc1', '2026-10-02', $q$Admin menanyakan apakah kami dari mahasiswa UPN; dijawab bukan, kami jelaskan dari startup Sahaibat. Klinik minta surat permohonan ke UPN dulu karena tidak berdiri sendiri.$q$),
  ('8852d1fd-9d40-4477-ac3e-029cb7ad4f00', '2026-10-02', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$),
  ('cbe5e14b-41d8-457b-90ea-d6c10579ea3b', '2026-10-02', $q$Nomor dikonfirmasi; pitch terkirim. Dokter sedang libur panjang ke luar kota; praktik buka lagi tanggal 12 Oktober, akan dikabari lagi.$q$),
  ('89dde914-49ab-4a9a-bc66-7d9a58cf4f57', '2026-10-02', $q$Menolak (tidak bisa).$q$),
  ('cdac41e5-b899-4984-9fa7-466a267713cb', '2026-10-02', $q$Follow-up jadwal: bisa dijadwalkan Senin pagi 5 Oktober jam 08.00.$q$),
  ('5095449c-dbcd-4ac2-bb40-91dd9c455548', '2026-10-02', $q$Nomor dikonfirmasi (ada balasan otomatis pendaftaran); pitch riset terkirim.$q$),
  ('6fe0fde8-9c03-4cb0-90cd-524b46d660d1', '2026-10-02', $q$Hanya balasan otomatis (jadwal praktik, slow respon), lalu admin menanyakan apa yang bisa dibantu. Belum ada pitch.$q$),
  ('fdda4292-3a69-4f93-8be2-8a7302f1eed2', '2026-10-02', $q$Konfirmasi jadwal: dokter berkenan wawancara pukul 15.15 dan menanyakan via telepon atau video call. Kami kirim link Gmeet untuk wawancara hari ini.$q$),
  ('04bf1978-fedd-4c82-a4c6-a941a876729f', '2026-10-02', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$)
ON CONFLICT (lead_id, date) DO NOTHING;
COMMIT;
SELECT count(*) AS rows_for_date FROM sync_daily_summaries WHERE date='2026-10-02';
