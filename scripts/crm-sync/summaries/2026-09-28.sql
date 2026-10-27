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
