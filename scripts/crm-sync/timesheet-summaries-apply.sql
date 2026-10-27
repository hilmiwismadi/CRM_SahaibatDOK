-- sync_daily_summaries 2026-09-28 (19 rows)
BEGIN;
INSERT INTO sync_daily_summaries (lead_id, date, summary) VALUES
  ('9935be5d-b6a6-47ff-871a-2b231a987f33', '2026-09-28', $q$Nomor dikonfirmasi benar. Dokter sedang sakit, tetap menanggapi ramah dan mengaminkan doa saat kami minta maaf karena mengganggu. Belum ada kesepakatan wawancara.$q$),
  ('ae44cba1-3287-428d-b3ff-abbddb71354b', '2026-09-28', $q$Hanya balasan otomatis admin pendaftaran online (tidak melayani konsultasi/riset). Belum ada balasan dari orangnya.$q$),
  ('029f7741-0931-487f-9676-16c22b3c6a6f', '2026-09-28', $q$Nomor dikonfirmasi. Setelah pitch menanyakan kapan waktunya; dijawab menyesuaikan waktu kosong dokter Senin–Jumat. Sore ditanya ulang ketersediaannya, belum dibalas.$q$),
  ('ddaa2a0e-cc1f-443e-9296-45d78f10e3d2', '2026-09-28', $q$Follow-up surat: dijawab otomatis, lalu diminta menghubungi kembali lewat email info@binasehat.com.$q$),
  ('e77dc478-9042-4955-ac1f-c4d75954c30b', '2026-09-28', $q$Nomor dikonfirmasi; pitch terkirim. Admin menanyakan ke dokter dulu, kami diminta menunggu kabar.$q$),
  ('f788365d-2200-449b-99b7-25e0cd69d9a0', '2026-09-28', $q$Follow-up surat: dioper dari cabang Tridadi ke cabang ini, admin akan izin ke HRD dan memberi kontak HRD. Kami menghubungi kontak HRD tersebut dan mengirim pitch riset.$q$),
  ('7becb63f-7a96-46ca-9058-e02d3d90dc84', '2026-09-28', $q$Follow-up surat: klinik menolak, belum bisa membantu riset.$q$),
  ('763c888e-4058-4226-84e4-15adc37dd05b', '2026-09-28', $q$Dokter menanyakan RME apa yang biasa dipakai klinik lain (berbayar atau gratis). Dijawab sudah 9 klinik/praktik diwawancara dan diajak menjadi narasumber ke-10.$q$),
  ('48fbd86d-c4d2-4895-bbb2-3a85526b6702', '2026-09-28', $q$Nomor dikonfirmasi benar. Belum ada pitch atau pembicaraan lanjutan hari ini.$q$),
  ('eb72b9b0-787d-47fc-a69f-a33474b9967c', '2026-09-28', $q$Nomor dikonfirmasi; diminta chat saja karena sambil pelayanan. Pitch terkirim, admin menanyakan ke dokter dan kami diminta menunggu.$q$),
  ('f652435f-7d2f-49e5-b09e-8df927f11333', '2026-09-28', $q$Follow-up surat: persetujuan manajemen belum keluar karena bersamaan dengan rekredensial. Kami menanyakan rekredensial berlangsung sampai bulan apa.$q$),
  ('d6615b14-0821-4580-8ccc-0dbe2062a8ba', '2026-09-28', $q$Follow-up surat: hanya balasan otomatis customer care Poltekkes, lalu ditanya dengan siapa dan dari instansi mana.$q$),
  ('34bb7ec6-b62e-4892-8f39-4744140c17b9', '2026-09-28', $q$Follow-up surat: klinik akan mengabari. Lalu meminta penjelasan lebih sederhana, menanyakan waktu, apakah via Zoom, durasi, dan manfaat untuk klinik. Dijelaskan online meeting 20–30 menit dan bukan untuk menggantikan RME. Klinik sudah memakai RME Assist.id (kerja sama vendor); kami ajak bertukar pengalaman memakai Assist. Jadwal Selasa–Kamis diusulkan, belum ada waktu pasti.$q$),
  ('8140e71c-b2d2-474f-83d0-dbcc77e5d484', '2026-09-28', $q$Nomor dikonfirmasi benar (ada balasan otomatis, konsultasi lewat chat saja); pitch riset terkirim.$q$),
  ('30ea9a94-73dd-46aa-b0a5-fd4438244a08', '2026-09-28', $q$Hanya membalas ucapan selamat pagi dan "baik kak". Tidak ada pesan keluar hari ini.$q$),
  ('2d9ed694-7dcb-4af7-bc77-9c280519a64c', '2026-09-28', $q$Follow-up surat: belum bisa melayani, disarankan menghubungi Ultra pusat Surabaya. Kami menanyakan kontaknya; hanya dijawab "baik kak" tanpa kontak.$q$),
  ('cc585827-83b6-4c73-870c-2cf6ec8c4c64', '2026-09-28', $q$Nomor dikonfirmasi benar.$q$),
  ('88c75b36-c969-4fdb-937c-4924e47b2314', '2026-09-28', $q$Nomor dikonfirmasi; pitch terkirim dan dokter menyilakan. Kami tanya jadwal Senin–Rabu; dokter minta dikirimi surat resmi dulu, surat akan kami siapkan.$q$),
  ('fdda4292-3a69-4f93-8be2-8a7302f1eed2', '2026-09-28', $q$Nomor dikonfirmasi benar dan menanyakan keperluan kami.$q$)
ON CONFLICT (lead_id, date) DO NOTHING;
COMMIT;
SELECT count(*) AS rows_for_date FROM sync_daily_summaries WHERE date='2026-09-28';

-- sync_daily_summaries 2026-09-30 (37 rows)
BEGIN;
INSERT INTO sync_daily_summaries (lead_id, date, summary) VALUES
  ('d2e7847c-7e83-46bf-aec3-51840697272b', '2026-09-30', $q$Nomor dikonfirmasi; pitch terkirim. Hari ini tidak bisa karena sedang pelayanan; klinik sedang persiapan rekredensialing dan akan menanyakan dulu. Kami akan tanya lagi minggu depan.$q$),
  ('5f30e657-dd36-4345-afb8-59c5be2f0124', '2026-09-30', $q$Follow-up: praktik tidak bekerja sama dengan BPJS dan sudah memakai RME Assist sejak Desember 2023. Kami minta izin bertanya soal pengalaman memakai Assist, belum dijawab.$q$),
  ('80711a42-048e-4451-b5b9-cd0506823bdf', '2026-09-30', $q$Nomor dikonfirmasi (ada balasan otomatis). Menanyakan apakah wawancara lewat WA atau telepon, dijawab online meeting; menanyakan dokumen resmi. Akhirnya menyatakan belum bersedia.$q$),
  ('1ca6ad55-4f95-4502-8dd4-3e782b3135ea', '2026-09-30', $q$Follow-up surat: diminta bersurat resmi dulu untuk administrasi. Surat sudah kami lampirkan.$q$),
  ('da060eba-ceb3-4ece-93ac-f9ab1f2851ef', '2026-09-30', $q$Follow-up: dijawab otomatis (jam operasional), lalu menjawab belum ada kabar. Kami akan tanya ulang minggu depan.$q$),
  ('bde8af6e-5179-42f7-988d-a3d870449fbc', '2026-09-30', $q$Konfirmasi nomor terkirim; baru ada balasan otomatis salam, belum dari orangnya.$q$),
  ('be1f860c-feb2-4912-a982-1980c432b88b', '2026-09-30', $q$Nomor dikonfirmasi; pitch terkirim. Ditanyakan ke atasan dan klinik menyatakan belum diperkenankan membantu (surat resmi pun tidak mengubah). Pertanyaan terakhir soal RME dijawab tidak tahu karena ini nomor klinik.$q$),
  ('763c888e-4058-4226-84e4-15adc37dd05b', '2026-09-30', $q$Dokter masih sibuk beberapa hari ke depan dan minta dihubungi lagi. Kami follow-up minggu depan.$q$),
  ('dae27e78-5232-4277-8eff-021434a6ded8', '2026-09-30', $q$Hanya balasan otomatis (klinik skincare, jam operasional). Belum ada balasan dari orangnya.$q$),
  ('12af5002-7545-4923-ba1d-034506fd9da0', '2026-09-30', $q$Nomor dikonfirmasi benar; pitch terkirim. Admin meminta menunggu sebentar.$q$),
  ('9dc1e238-4297-4a53-99fd-5a0d8a78ffc1', '2026-09-30', $q$Nomor dikonfirmasi; pitch terkirim. Klinik sedang pelayanan dan menyarankan dihubungi lagi sekitar jam 12 siang; kami tanya ulang besok.$q$),
  ('02886d42-464f-430d-9777-8aa6c31ef903', '2026-09-30', $q$Nomor dikonfirmasi (ada balasan otomatis); pitch terkirim. Admin akan menyampaikan ke manajemen dulu.$q$),
  ('8380792f-d420-4a04-a51a-8bed19a3ee91', '2026-09-30', $q$Follow-up: akan dikonfirmasikan ke manajemen dan diminta surat/proposal. Surat sudah kami lampirkan.$q$),
  ('5b689a68-00d6-420a-aefa-7d7997572fbc', '2026-09-30', $q$Klinik baru mencoba sistem satu kali, belum ada kendala dan besok mau coba lagi. Menanyakan setting integrasi SatuSehat dan setuju dibantu. Kami tawarkan online meeting Senin depan.$q$),
  ('9923d92d-3232-48eb-bfa6-2bc5c70d678c', '2026-09-30', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$),
  ('a9b98885-0eb9-4ac0-a648-2af4d5cb1a95', '2026-09-30', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$),
  ('a297652f-002b-4aa6-ab39-cce0c55e099a', '2026-09-30', $q$Hanya balasan otomatis terima kasih; kami kirim konfirmasi nomor ulang, belum ada balasan dari orangnya.$q$),
  ('3b48146f-8c86-4a8d-b86b-9481b2c22256', '2026-09-30', $q$Nomor dikonfirmasi benar (ada balasan otomatis); pitch riset terkirim.$q$),
  ('f6930a4d-d3c1-49b9-958a-942751e9b396', '2026-09-30', $q$Nomor dikonfirmasi; admin menanyakan apakah ini pribadi, lembaga, LSM, atau kampus. Kami jelaskan dari startup Sahaibat.$q$),
  ('2fda3702-7a7c-4391-aa06-6451fd2f36d0', '2026-09-30', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$),
  ('6377380b-349d-4450-a4b8-de73cdd530f9', '2026-09-30', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$),
  ('3d7df820-f6f3-41a9-87d1-a367293e53db', '2026-09-30', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$),
  ('50f0ba5c-797f-4d41-9604-748cc578b574', '2026-09-30', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$),
  ('65f397cc-93c3-4245-8019-18d4c66e1d65', '2026-09-30', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$),
  ('d9261919-9ea0-4be7-a7a2-c3df1a69483e', '2026-09-30', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$),
  ('c0c97113-749d-4994-b07f-ce9e97590cc1', '2026-09-30', $q$Nomor dikonfirmasi (PIC klinik UPN); pitch riset terkirim.$q$),
  ('735c42b9-d238-4b34-91e3-56f43af5e098', '2026-09-30', $q$Bukan nomor klinik UPN ("bukan kak"); kami berterima kasih dan menutup.$q$),
  ('78b71aa4-5179-4671-b27e-fe2f710edc5d', '2026-09-30', $q$Nomor dikonfirmasi; pitch terkirim. Akan disampaikan ke pimpinan dulu, kami minta dikabari.$q$),
  ('0916b0da-dc2d-4f9f-9664-c473ca256a75', '2026-09-30', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$),
  ('6fbf7340-7da2-478d-a9e3-3986d81c6288', '2026-09-30', $q$Nomor dikonfirmasi; pitch terkirim. Klinik menyarankan datang langsung; konsultasi online tidak bisa dilayani (buka 24 jam).$q$),
  ('fc9a3ec1-fce8-4694-953f-0359b95b0447', '2026-09-30', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$),
  ('e54d57c5-63de-4c66-bc43-2c0ee139405d', '2026-09-30', $q$Nomor dikonfirmasi; pitch terkirim. Belum bisa membantu.$q$),
  ('4fc49db8-73dd-420c-a932-9a7f4c1e33e5', '2026-09-30', $q$Nomor dikonfirmasi. Menanyakan riset untuk apa dan menyebut ini praktik mandiri, bukan klinik. Kami jelaskan dari startup Sahaibat.$q$),
  ('fdda4292-3a69-4f93-8be2-8a7302f1eed2', '2026-09-30', $q$Meminta surat permohonan dulu; surat sudah kami kirim. Dokter berkenan diwawancara hari Jumat setelah jam 3 siang.$q$),
  ('ee3a268f-deba-4e68-a482-0358e65f2399', '2026-09-30', $q$Hari ini belum bisa; Jumat jam 8 pagi bisa. Kami akan konfirmasi ulang Jumat pagi.$q$),
  ('e033075e-17fc-4324-8ae2-dc05b236f382', '2026-09-30', $q$Follow-up: hanya balasan otomatis pendaftaran pasien. Belum ada balasan dari orangnya.$q$),
  ('05fbf0ff-a448-48c4-9841-11044386c5f0', '2026-09-30', $q$Nomor dikonfirmasi benar; pitch riset terkirim.$q$)
ON CONFLICT (lead_id, date) DO NOTHING;
COMMIT;
SELECT count(*) AS rows_for_date FROM sync_daily_summaries WHERE date='2026-09-30';

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

-- sync_daily_summaries 2026-10-03 (1 rows)
BEGIN;
INSERT INTO sync_daily_summaries (lead_id, date, summary) VALUES
  ('3b48146f-8c86-4a8d-b86b-9481b2c22256', '2026-10-03', $q$Meminta dikirimi surat dari kampus dulu untuk disampaikan ke manajemen.$q$)
ON CONFLICT (lead_id, date) DO NOTHING;
COMMIT;
SELECT count(*) AS rows_for_date FROM sync_daily_summaries WHERE date='2026-10-03';

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

-- sync_daily_summaries 2026-10-09 (42 rows)
BEGIN;
INSERT INTO sync_daily_summaries (lead_id, date, summary) VALUES
  ('c46b90c6-6f17-4cb2-a702-6c0632d8b5a0', '2026-10-09', $q$Pesan konfirmasi nomor terkirim pagi. Belum ada balasan.$q$),
  ('3707ee5e-a338-4732-b554-68a43772b167', '2026-10-09', $q$Nomor dikonfirmasi benar dan menanyakan siapa pengirimnya; pitch riset terkirim sore. Belum ada balasan lanjutan.$q$),
  ('846018ab-d58f-4933-b27c-4a93545a764e', '2026-10-09', $q$Nomor dikonfirmasi benar; pitch riset terkirim. Belum ada balasan lanjutan.$q$),
  ('ba5ec893-5a61-4348-a276-3c49830937b1', '2026-10-09', $q$Menolak wawancara ("coba lainnya saja"). Saat ditanya, pencatatan pasien masih lebih banyak manual (sebagian digital, bidan delima memakai aplikasi Odelia) dan belum berencana beralih digital ("manual saja dulu").$q$),
  ('2a540786-8388-478a-a649-2d913a2ab179', '2026-10-09', $q$Kami menyampaikan akan menanyakan ulang minggu depan. Tidak ada pesan masuk hari ini.$q$),
  ('699c6d8c-556f-4a7e-a25c-dc7769ca9313', '2026-10-09', $q$Nomor dikonfirmasi benar; pitch riset terkirim sore. Belum ada balasan lanjutan.$q$),
  ('cee447cb-e97d-46b3-96f2-024747119e5c', '2026-10-09', $q$Pesan konfirmasi nomor dibalas "Pagi," saja; pitch belum terkirim.$q$),
  ('19accc07-fc93-4c6a-9a81-4ca0d776cecd', '2026-10-09', $q$Nomor dikonfirmasi benar dan menanyakan siapa pengirimnya; pitch riset terkirim. Belum ada balasan lanjutan.$q$),
  ('8f20bf4a-9867-46d2-ad61-c1ecc141a975', '2026-10-09', $q$Dijawab ("ada yg bisa kami bantu?"); pitch riset terkirim. Belum ada balasan lanjutan.$q$),
  ('472f4446-4597-4212-8c60-ad7f986a53df', '2026-10-09', $q$Nomor dikonfirmasi benar dan menanyakan keperluan; pitch riset terkirim sore. Belum ada balasan lanjutan.$q$),
  ('f7a8a1d4-ef7e-4efc-8c57-3964b2845564', '2026-10-09', $q$Nomor dikonfirmasi benar; setelah pitch, klinik menanyakan "ini dari mana", lalu kami jelaskan asal startup Sahaibat dan program CSR NTT. Belum ada balasan lanjutan.$q$),
  ('8e0dab20-7f7a-4037-8e0a-72e47b6b3a92', '2026-10-09', $q$Pesan konfirmasi nomor terkirim sore. Belum ada balasan.$q$),
  ('99d2d8ff-353c-4f26-8f30-c0741fc2d308', '2026-10-09', $q$Pesan konfirmasi nomor terkirim pagi. Belum ada balasan.$q$),
  ('5eafb625-9f1a-4322-acfb-9f3aba88d6b0', '2026-10-09', $q$Pesan konfirmasi nomor terkirim pagi. Belum ada balasan.$q$),
  ('f9493ec1-c608-437e-9590-b8b1610a96f3', '2026-10-09', $q$Nomor dikonfirmasi benar; setelah pitch, mereka akan konfirmasi dulu internal dan menanyakan dari universitas mana. Kami jelaskan asal dari startup Sahaibat. Menunggu kabar dari mereka.$q$),
  ('fb0c5be3-fb66-4b96-b8dd-eebebfd7e0b9', '2026-10-09', $q$Pesan konfirmasi nomor terkirim pagi. Belum ada balasan.$q$),
  ('09988382-f0f9-4613-a829-90c9ab32a4de', '2026-10-09', $q$Mendapat balasan otomatis layanan klinik lalu konfirmasi "iya benar"; pitch riset terkirim malam. Belum ada balasan lanjutan.$q$),
  ('8cdf7bc8-a0f4-4ccb-8655-643f730147ce', '2026-10-09', $q$Nomor dikonfirmasi benar; setelah pitch, klinik menanyakan dari lembaga mana, lalu kami jelaskan asal startup Sahaibat dan program CSR NTT. Belum ada balasan lanjutan.$q$),
  ('e10d77a4-9d2b-45dd-ada1-e0e8942d5e43', '2026-10-09', $q$Hanya dibalas pesan otomatis format pendaftaran pasien. Belum ada respons dari manusia.$q$),
  ('2a8add2c-6f78-4890-9bcc-e87bb86d2b63', '2026-10-09', $q$Ada balasan otomatis jam layanan, lalu dikonfirmasi benar dan ditanya ada yang bisa dibantu; pitch riset terkirim. Belum ada balasan lanjutan.$q$),
  ('af6326ba-4a7f-4a62-b0ac-b2e86cf83e65', '2026-10-09', $q$Hanya dibalas pesan otomatis soal pendaftaran pasien (via link dan transfer admin); pitch riset terkirim sore. Belum ada balasan lanjutan.$q$),
  ('52e99f27-a3e9-408f-b95d-e20d2a07e823', '2026-10-09', $q$Nomor dikonfirmasi benar; pitch riset terkirim. Belum ada balasan lanjutan.$q$),
  ('17a1b95f-8c28-4f98-834e-446d827b6421', '2026-10-09', $q$Nomor dikonfirmasi benar; setelah pitch, menjawab "mohon maaf belum bersedia". Kami ucapkan terima kasih.$q$),
  ('aecdcbc2-39eb-463a-975c-557757f3a552', '2026-10-09', $q$Hanya dibalas pesan otomatis admin (jadwal praktik dan format pendaftaran). Belum ada respons dari manusia.$q$),
  ('8885d5e7-d9ce-4e55-ae67-8c0ffb343b26', '2026-10-09', $q$Setelah balasan otomatis admin, nomor dikonfirmasi benar ("iya betul"); pitch riset terkirim. Belum ada balasan lanjutan.$q$),
  ('a11c88c9-af36-418c-99b2-50648b8f7b17', '2026-10-09', $q$Pesan konfirmasi nomor terkirim pagi. Belum ada balasan.$q$),
  ('4dea2006-5a09-4405-8d80-916c9e514739', '2026-10-09', $q$Nomor dikonfirmasi benar; setelah pitch, menjawab "waktunya yg bingung saya". Kami tawarkan minggu depan antara Senin–Rabu. Menunggu jawaban.$q$),
  ('9cc78583-3a5b-46c1-ad13-a10d051aa0b3', '2026-10-09', $q$Nomor dikonfirmasi benar; pitch riset terkirim. Belum ada balasan lanjutan.$q$),
  ('50493ae3-0d07-458a-89af-be5e223aeeb0', '2026-10-09', $q$Nomor dikonfirmasi benar; pitch riset terkirim. Belum ada balasan lanjutan.$q$),
  ('b3ee397f-a432-4116-959c-fbd4770869f9', '2026-10-09', $q$Nomor dikonfirmasi benar; setelah pitch, menyampaikan belum bisa karena sedang di rumah sakit (bapak mertua opname). Kami doakan kesembuhan; perlu follow up di lain waktu.$q$),
  ('cc52b174-fd18-437c-9fd0-db1c629476f0', '2026-10-09', $q$Pesan konfirmasi nomor terkirim sore; hanya masuk balasan kosong (tanpa teks). Belum ada jawaban.$q$),
  ('e5736b87-253c-4293-98c9-aa3418daeb4e', '2026-10-09', $q$Hanya dibalas pesan sapaan otomatis dan satu tanda "?"; pitch riset terkirim sore. Belum ada jawaban dari manusia.$q$),
  ('021b243a-093b-4edb-af91-9fc71ef7de21', '2026-10-09', $q$Dijawab bidan Ely, asisten dr. Gogot, yang membenarkan nomor; pitch riset terkirim. Belum ada balasan lanjutan.$q$),
  ('56631e1e-fea3-463f-8dad-4f61dd312092', '2026-10-09', $q$Nomor dikonfirmasi benar dan menanyakan keperluan; pitch riset terkirim. Belum ada balasan lanjutan.$q$),
  ('5ffc07b7-27d6-417f-81ec-95c48812cc5a', '2026-10-09', $q$Pesan konfirmasi nomor terkirim pagi. Belum ada balasan.$q$),
  ('6cea163e-fdb1-4936-aead-478adc8566ea', '2026-10-09', $q$Menanyakan siapa pengirim; setelah pitch, menjawab sudah menggunakan sistem. Kami jelaskan ini riset, bukan penawaran, dan menanyakan pengalaman memakai sistem. Belum ada balasan.$q$),
  ('7d8e8f53-16d4-4622-9b3a-1928a723471b', '2026-10-09', $q$Nomor dikonfirmasi ("nggih"); pitch riset terkirim. Belum ada balasan lanjutan.$q$),
  ('11aeee81-5d06-4f32-88fe-ee4f59511bfa', '2026-10-09', $q$Dijawab admin dr. Daniel, yang akan menyampaikan ke dokter setelah pelayanan selesai dan perlu izin dulu. Kami minta dikabari; menunggu informasi.$q$),
  ('219dacd0-1e68-4858-b3bc-1257f1ba1c3e', '2026-10-09', $q$Setelah balasan otomatis jadwal praktik, nomor dikonfirmasi benar dan menanyakan keperluan; pitch riset terkirim. Belum ada balasan lanjutan.$q$),
  ('e53e06e6-d365-41be-a22c-e84a6c6efcc3', '2026-10-09', $q$Nomor dikonfirmasi benar; pitch riset terkirim. Belum ada balasan lanjutan.$q$),
  ('1ce27c13-9426-4247-9c1c-09f887331c18', '2026-10-09', $q$Nomor dikonfirmasi benar; setelah pitch, menyampaikan ada acara keluarga di Jogja. Kami tawarkan minggu depan atau dua minggu lagi (wawancara daring). Menunggu jawaban.$q$),
  ('b1890f33-9242-431a-bb2a-c62daba0d6ba', '2026-10-09', $q$Nomor dikonfirmasi benar dan menanyakan keperluan; pitch riset terkirim. Belum ada balasan lanjutan.$q$)
ON CONFLICT (lead_id, date) DO NOTHING;
COMMIT;
SELECT count(*) AS rows_for_date FROM sync_daily_summaries WHERE date='2026-10-09';

-- sync_daily_summaries 2026-10-10 (2 rows)
BEGIN;
INSERT INTO sync_daily_summaries (lead_id, date, summary) VALUES
  ('fb0c5be3-fb66-4b96-b8dd-eebebfd7e0b9', '2026-10-10', $q$Membenarkan nomor klinik ("Iya bener").$q$),
  ('11aeee81-5d06-4f32-88fe-ee4f59511bfa', '2026-10-10', $q$Dokter meminta kami mewakilkan ke admin; admin baru masuk Senin malam.$q$)
ON CONFLICT (lead_id, date) DO NOTHING;
COMMIT;
SELECT count(*) AS rows_for_date FROM sync_daily_summaries WHERE date='2026-10-10';

