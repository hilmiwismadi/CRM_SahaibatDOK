-- Dihasilkan 2026-10-14T08:36:45.209Z dari wa-export-2026-10-140829.json: 202 pesan, 49 chat
\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE bf (phone text, mid text, dir text, body text, mtype text, sent_at timestamp, approx boolean) ON COMMIT DROP;
INSERT INTO bf VALUES
($q$+628113507020$q$, $q$3EB016680378E6FB25F078$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Dian Kusuma Wijaya?$q$, $q$text$q$, '2026-10-13 06:33:00'::timestamp, false),
($q$+628113507020$q$, $q$AC943C09C31270FA1B9FC54042D883F4$q$, $q$inbound$q$, $q$Selamat siang 
Iya benar$q$, $q$text$q$, '2026-10-13 06:33:01'::timestamp, false),
($q$+628113507020$q$, $q$3EB0C27199CD6C7D41604B$q$, $q$outbound$q$, $q$Selamat siang, perkenalkan saya Dzaki Wismadi. Saat ini saya sedang melakukan riset terkait pengembangan sistem informasi untuk membantu operasional dan administrasi layanan kesehatan, khususnya praktik mandiri dan klinik.

Saya menemukan melalui Google Maps dan melihat ulasan yang positif dari para pasien. Saya berniat untuk mempelajari lebih jauh mengenai pelayanan dan operasional yang dilakukan Klinik Dian Kusuma Wijaya sehingga ingin meminta waktu sekitar 20–30 menit untuk berdiskusi secara online melalui sesi tanya jawab.

Apakah dari pihak Klinik Dian Kusuma Wijaya berkenan menjadi narasumber? Untuk jadwalnya, saya fleksibel dan dapat menyesuaikan dengan waktu luang staf yang bersangkutan atau dokter, baik 2–3 hari ke depan maupun minggu depan. Terima kasih 🙏☺️$q$, $q$text$q$, '2026-10-13 06:38:00'::timestamp, false),
($q$+628113507020$q$, $q$ACD0DFFBF3FE9A673EBCD1991D9D2B89$q$, $q$inbound$q$, $q$Mohon maaf untuk klinik kami belum menggunakan Sistem informasi digital jadi semuanya masih manual menggunakan buku rekam medis$q$, $q$text$q$, '2026-10-13 06:41:00'::timestamp, false),
($q$+628113507020$q$, $q$3EB09F230C876B36F34539$q$, $q$outbound$q$, $q$Baik tidak apa kak, apakah berkenan kami tanya-tanya. karena dari kami sendiri juga perlu tau untuk klinik yang menggunakan rekam medis kertas itu alurnya seperti apa, lalu kendala yang dirasakan dan sebagainya

supaya sistem digital yang kami rancang juga mudah dan nyaman digunakan apabila ingin diperkenalkan kepada klinik yang terbiasa menggunakan buku/catatan kertas ☺️$q$, $q$text$q$, '2026-10-13 06:46:00'::timestamp, false),
($q$+628113507020$q$, $q$ACD466FFEDE41A00E604145EBDF4A0D3$q$, $q$inbound$q$, $q$Apa sudah menghubungi Bu dokter?$q$, $q$text$q$, '2026-10-13 07:05:00'::timestamp, false),
($q$+628113507020$q$, $q$3EB02A76BE5A4713935702$q$, $q$outbound$q$, $q$Belum kak, sebenarnya dari saya tidak harus dengan dokter. bisa dengan staff yang berkaitan dengan administrasi rekam medis dan manajamen pelayanan jika ada$q$, $q$text$q$, '2026-10-13 07:25:00'::timestamp, false),
($q$+628113507020$q$, $q$AC05954FB2263F61DDFA310742A1E50D$q$, $q$inbound$q$, $q$Baik kak nanti saya sampaikan kepada yang bersangkutan$q$, $q$text$q$, '2026-10-13 07:28:00'::timestamp, false),
($q$+628113507020$q$, $q$3A73F56C84339517FE0E$q$, $q$outbound$q$, $q$Baik, Mohon kabari saya jika sudah ada informasi terbaru  🙏$q$, $q$text$q$, '2026-10-13 07:47:00'::timestamp, false),
($q$+628113507020$q$, $q$ACA329A1E19871237A08E47B72BFB3F6$q$, $q$inbound$q$, $q$Mohon maaf ini untuk keperluan akademis atau keperluan lain?$q$, $q$text$q$, '2026-10-13 10:08:00'::timestamp, false),
($q$+62811360923$q$, $q$3EB0532DE20523A997E65F$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Madyopuro Medical Center?$q$, $q$text$q$, '2026-10-13 07:23:00'::timestamp, false),
($q$+62811360923$q$, $q$AC77276D60A7BD3BBA1F0A89520A9C40$q$, $q$inbound$q$, $q$Iya ka$q$, $q$text$q$, '2026-10-13 07:44:00'::timestamp, false),
($q$+6285784305377$q$, $q$3EB0067DD369092EA5DE67$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Safa Homecare?$q$, $q$text$q$, '2026-10-13 07:23:00'::timestamp, false),
($q$+6285784305377$q$, $q$2A3A32D8813595C4B587$q$, $q$inbound$q$, $q$Selamat siang kak ada yang bisa kami bantu$q$, $q$text$q$, '2026-10-13 07:23:01'::timestamp, false),
($q$+6285784305377$q$, $q$2A5295C7344E1F8643B6$q$, $q$inbound$q$, $q$Malam kak apakah jadi kami bantu perawatan sesuai dengan keluhan kakaknya$q$, $q$text$q$, '2026-10-13 12:32:00'::timestamp, false),
($q$+628179663770$q$, $q$3EB04A13B0324D5E4FAF7E$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Praktik Dokter Arif?$q$, $q$text$q$, '2026-10-13 07:23:00'::timestamp, false),
($q$+628179663770$q$, $q$AC7334AA38B88F2FA4BDCF5855880C7B$q$, $q$inbound$q$, $q$Iya$q$, $q$text$q$, '2026-10-13 07:39:00'::timestamp, false),
($q$+6285257575834$q$, $q$3EB070434D9B8C7B3470ED$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Praktik Mandiri dr. Sulistyorini?$q$, $q$text$q$, '2026-10-13 06:33:00'::timestamp, false),
($q$+6285257575834$q$, $q$A5ECE61AF13EC0E763669A5243879695$q$, $q$inbound$q$, $q$Benar$q$, $q$text$q$, '2026-10-13 07:09:00'::timestamp, false),
($q$+6285257575834$q$, $q$3EB054B18754132D33B87D$q$, $q$outbound$q$, $q$Selamat siang, perkenalkan saya Dzaki Wismadi. Saat ini saya sedang melakukan riset terkait pengembangan sistem informasi untuk membantu operasional dan administrasi layanan kesehatan, khususnya praktik mandiri dan klinik.

Saya menemukan melalui Google Maps dan melihat ulasan yang positif dari para pasien. Saya berniat untuk mempelajari lebih jauh mengenai pelayanan dan operasional yang dilakukan Praktik Mandiri dr. Sulistyorini sehingga ingin meminta waktu sekitar 20–30 menit untuk berdiskusi secara online melalui sesi tanya jawab.

Apakah dari pihak Praktik Mandiri dr. Sulistyorini berkenan menjadi narasumber? Untuk jadwalnya, saya fleksibel dan dapat menyesuaikan dengan waktu luang staf yang bersangkutan atau dokter, baik 2–3 hari ke depan maupun minggu depan. Terima kasih 🙏☺️$q$, $q$text$q$, '2026-10-13 07:16:00'::timestamp, false),
($q$+6285257575834$q$, $q$A5333EBACD8C49901C2E25564098B534$q$, $q$inbound$q$, $q$Mohon maaf kami tidak bisa memenuhi permintaan mas Dzaki .🙏🙏🙏$q$, $q$text$q$, '2026-10-13 07:23:00'::timestamp, false),
($q$+6285179797922$q$, $q$3EB0CEE45332E3D2740EB2$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Arrayan Medika?$q$, $q$text$q$, '2026-10-13 06:34:00'::timestamp, false),
($q$+6285179797922$q$, $q$3EB0A9D5AD16738C510ECF$q$, $q$inbound$q$, $q$Inggih benar ada yang bisa di bantu inggih🙏🏻😊$q$, $q$text$q$, '2026-10-13 06:48:00'::timestamp, false),
($q$+6285179797922$q$, $q$3EB0FE5708505980CB50F1$q$, $q$outbound$q$, $q$Selamat siang, perkenalkan saya Dzaki Wismadi. Saat ini saya sedang melakukan riset terkait pengembangan sistem informasi untuk membantu operasional dan administrasi layanan kesehatan, khususnya praktik mandiri dan klinik.

Saya menemukan melalui Google Maps dan melihat ulasan yang positif dari para pasien. Saya berniat untuk mempelajari lebih jauh mengenai pelayanan dan operasional yang dilakukan Klinik Arrayan Medika sehingga ingin meminta waktu sekitar 20–30 menit untuk berdiskusi secara online melalui sesi tanya jawab.

Apakah dari pihak Klinik Arrayan Medika berkenan menjadi narasumber? Untuk jadwalnya, saya fleksibel dan dapat menyesuaikan dengan waktu luang staf yang bersangkutan atau dokter, baik 2–3 hari ke depan maupun minggu depan. Terima kasih 🙏☺️$q$, $q$text$q$, '2026-10-13 06:52:00'::timestamp, false),
($q$+6285179797922$q$, $q$3EB0ACB8A0FD10A2025BB4$q$, $q$inbound$q$, $q$mohon maaf ini dari mana ,dan untuk kepentingan apa inggih🙏🏻🙏🏻$q$, $q$text$q$, '2026-10-13 06:54:00'::timestamp, false),
($q$+6285179797922$q$, $q$3EB03CDB84D0CC6030729A$q$, $q$outbound$q$, $q$Berkaitan dengan pesan saya sebelumnya, saya dari startup https://www.sahaibat.com/ yang sebelumnya kami bekerja sama pada program CSR membangun sistem Kesehatan di daerah NTT

Lalu kami berencana melanjutkan program kolaborasi dengan badan FKTP (klinik/praktik mandiri) di sekitar Jawa dalam pembangan sistem manajemen fasilitas kesehatan, tapi dalam prosesnya saya ditugaskan untuk riset ke lapangan bagaimana sistem yang sudah diadopsi di masyarakat. 

pertanyaan kurang lebih seperti:
Alur pasien mulai dari pendaftaran hingga selesai konsultasi;
Proses penjadwalan dan pencatatan rekam medis;
Sistem digital atau pencatatan manual yang saat ini digunakan;
Kendala atau kebutuhan yang masih dirasakan dalam proses tersebut.

Apakah pihak klinik berkenan menjadi salah satu narasumber kami🙏?$q$, $q$text$q$, '2026-10-13 07:06:00'::timestamp, false),
($q$+6285179797922$q$, $q$3EB0B47141C8A05C15B92E$q$, $q$inbound$q$, $q$inggih kami sampaikan dulu ke pimpinan kami terlebih dahulu inggih🙏🏻🙏🏻$q$, $q$text$q$, '2026-10-13 07:23:00'::timestamp, false),
($q$+628113509602$q$, $q$3EB017E98C27E76C0BA486$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Nayaka Husada 02?$q$, $q$text$q$, '2026-10-13 07:23:00'::timestamp, false),
($q$+628113509602$q$, $q$A5BD693C302BA3F8A9BEB45FF9CB5B4C$q$, $q$inbound$q$, $q$Hallo sahabat Nayaka👋                                   Terima kasih telah menghubungi Klinik Nayaka Husada 02 PAKIS. Ada yang bisa kami bantu ?                             
                                                                                           Mohon menunggu, pesan akan kami balas sesuai antrian.

Terimakasih salam sehat 💚$q$, $q$text$q$, '2026-10-13 07:23:01'::timestamp, false),
($q$+628113509602$q$, $q$A5F1F7A8E9E2CDCF68337DE96F12C199$q$, $q$inbound$q$, $q$Iya selamat sore
Iya benar bpk, ada yg bisa kami bantu 🙏🏻$q$, $q$text$q$, '2026-10-13 07:37:00'::timestamp, false),
($q$+6285692796199$q$, $q$3EB09CF27A741ADF61224A$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Hari Husada?$q$, $q$text$q$, '2026-10-13 07:22:00'::timestamp, false),
($q$+6285692796199$q$, $q$A51AAD34961C952D09C3997EB092D84C$q$, $q$inbound$q$, $q$Terima kasih telah menghubungi Klinik Hari Husada. Silakan beri tahu apa yang dapat kami bantu.$q$, $q$text$q$, '2026-10-13 07:22:01'::timestamp, false),
($q$+6285692796199$q$, $q$A564ABEA9A230B9A18B3F3FF98D0E423$q$, $q$inbound$q$, $q$Iya ka benar$q$, $q$text$q$, '2026-10-13 07:23:00'::timestamp, false),
($q$+6282128953388$q$, $q$3EB02FEBB398E7E8C11D26$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Praktek dokter Yenny?$q$, $q$text$q$, '2026-10-13 07:22:00'::timestamp, false),
($q$+6282128953388$q$, $q$ACD51ED75C0DC45DBF8C4C0163608C8B$q$, $q$inbound$q$, $q$Soree$q$, $q$text$q$, '2026-10-13 09:05:00'::timestamp, false),
($q$+6282128953388$q$, $q$ACD8DEC7D2A6DAE392A2EFAF61F25B3F$q$, $q$inbound$q$, $q$Iya benar$q$, $q$text$q$, '2026-10-13 09:05:01'::timestamp, false),
($q$+6281222448836$q$, $q$3EB0CE71411D1D99909613$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Praktik Dokter Abirama Care?$q$, $q$text$q$, '2026-10-13 07:22:00'::timestamp, false),
($q$+6281222448836$q$, $q$A5525BA12ABE8EBEB8B0F9BE5ABE22A4$q$, $q$inbound$q$, $q$Terima kasih telah menghubungi Abirama Care. Ada yang bisa kami bantu?$q$, $q$text$q$, '2026-10-13 07:22:01'::timestamp, false),
($q$+6281222448836$q$, $q$A56415C1F13921D4D6D49F408384FA9B$q$, $q$inbound$q$, $q$Salam sehat sahabat Abirama Care

Terima kasih telah menghubungi Abirama Care, namun saat ini kami sedang tidak berada di tempat.
Pesan Anda akan segera kami balas pada saat jam kerja Senin-Jumat pukul 07.00-11.00 atau 16.00-21.00
Sabtu pukul 16.00-21.00
Hari Minggu atau tanggal Merah kami TUTUP

Mungkin selagi menunggu balasan dari kami, anda dapat menyampaikan pesan melalui nomor kami atau telepon pada nomor 0341-8561179

Terima kasih🙏$q$, $q$text$q$, '2026-10-13 07:22:02'::timestamp, false),
($q$+6281222448836$q$, $q$3EB0EB9D1D7799CB9B297E$q$, $q$inbound$q$, $q$Selamat malam, benar kak$q$, $q$text$q$, '2026-10-13 11:01:00'::timestamp, false),
($q$+6282232929617$q$, $q$3EB00CCB303EA91D5F5CDC$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Bidan Praktek Mandiri Veronika Dewi?$q$, $q$text$q$, '2026-10-13 07:18:00'::timestamp, false),
($q$+6282232929617$q$, $q$3AA6374279C7419C12E5$q$, $q$inbound$q$, $q$selamat siang iyah betul dgn admin bidan veronika ada yg bisa di bantu?$q$, $q$text$q$, '2026-10-13 07:22:00'::timestamp, false),
($q$+6285649214695$q$, $q$3EB08E3087239FAF664DC5$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Wonder Kidz Therapy Center?$q$, $q$text$q$, '2026-10-13 07:19:00'::timestamp, false),
($q$+6285649214695$q$, $q$A550E404596E0AA355A0122872A5E6AC$q$, $q$inbound$q$, $q$Selamat siang, benar. Ada yang bisa kami bantu? 😊🙏$q$, $q$text$q$, '2026-10-13 07:21:00'::timestamp, false),
($q$+628113132292$q$, $q$3EB0515A9B2A81CEE31F76$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Jeru Medis?$q$, $q$text$q$, '2026-10-13 07:19:00'::timestamp, false),
($q$+628113132292$q$, $q$A5A558E8C00CE301CF8F40E1D374AFE5$q$, $q$inbound$q$, $q$Terima kasih telah menghubungi Jeru Medika. Silakan beri tahu apa yang bisa kami bantu.$q$, $q$text$q$, '2026-10-13 07:19:01'::timestamp, false),
($q$+628113132292$q$, $q$A51C63F08C508731EA8976B198065A00$q$, $q$inbound$q$, $q$Inggih benar bu/ pak$q$, $q$text$q$, '2026-10-13 07:21:00'::timestamp, false),
($q$+628113132292$q$, $q$A551BFE31D5EDCCD806E407BCCA853B9$q$, $q$inbound$q$, $q$Ada yang bisa kami bantu 🙏$q$, $q$text$q$, '2026-10-13 07:21:01'::timestamp, false),
($q$+6281546093283$q$, $q$3EB0CAB99E858487FAB0F9$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Mediska?$q$, $q$text$q$, '2026-10-13 06:51:00'::timestamp, false),
($q$+6281546093283$q$, $q$AC084FD7F36152AE2C04F3AE84F6046A$q$, $q$inbound$q$, $q$Iya selamat siang$q$, $q$text$q$, '2026-10-13 07:21:00'::timestamp, false),
($q$+6281546093283$q$, $q$AC120D80EDD7B09215EB77D2AA0BBFB1$q$, $q$inbound$q$, $q$Bener ini nomer Klinik Mediska Malang$q$, $q$text$q$, '2026-10-13 07:21:01'::timestamp, false),
($q$+628113642421$q$, $q$3EB04A9FB6EF2719678C48$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Kedungboto Medis?$q$, $q$text$q$, '2026-10-13 07:20:00'::timestamp, false),
($q$+628113642421$q$, $q$A5D3E4855C6AA6AB29CA649A54EA8DD5$q$, $q$inbound$q$, $q$Siang ibu$q$, $q$text$q$, '2026-10-13 08:56:00'::timestamp, false),
($q$+628113642421$q$, $q$A5DC03F282657F1E33A5E1AEDA7D120D$q$, $q$inbound$q$, $q$Betul$q$, $q$text$q$, '2026-10-13 08:56:01'::timestamp, false),
($q$+628113642421$q$, $q$A55F0FD2120F23E09264A5010C42E086$q$, $q$inbound$q$, $q$Ada yg bs kami bantu?$q$, $q$text$q$, '2026-10-13 08:56:02'::timestamp, false),
($q$+6282323986844$q$, $q$3EB051A6B8320EEBE80D4E$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Praktek Dokter Mandiri Bayung Lapangan?$q$, $q$text$q$, '2026-10-13 07:19:00'::timestamp, false),
($q$+6282323986844$q$, $q$AC121FCD7789F133B9B93CDF9DD449EB$q$, $q$inbound$q$, $q$Iya benar$q$, $q$text$q$, '2026-10-13 10:03:00'::timestamp, false),
($q$+6282323986844$q$, $q$AC843F5A6348D9D59010BB32D95C02B2$q$, $q$inbound$q$, $q$Ada yg bisa dibantu$q$, $q$text$q$, '2026-10-13 10:03:01'::timestamp, false),
($q$+6281358190704$q$, $q$3EB0C86ADB5A133665EEC1$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Bidan Delima Sidemiarti?$q$, $q$text$q$, '2026-10-13 07:19:00'::timestamp, false),
($q$+6281358190704$q$, $q$AC23BA66B1FA4444E6AD7DB7E434CB94$q$, $q$inbound$q$, $q$Iya$q$, $q$text$q$, '2026-10-13 10:11:00'::timestamp, false),
($q$+6285850633424$q$, $q$3EB0859E659BD1D95B310E$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Pratama Bani Rachman?$q$, $q$text$q$, '2026-10-13 07:18:00'::timestamp, false),
($q$+6285731339148$q$, $q$3EB05DB4C721BF12E2065B$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Pratama Rawat Jalan Albasrah?$q$, $q$text$q$, '2026-10-13 07:13:00'::timestamp, false),
($q$+6285731339148$q$, $q$A50B0BDCEEB753189E93E7313405CF72$q$, $q$inbound$q$, $q$Selamat sing, iya benar. Ada yang bisa kami bantu pak?🙏🏻☺️$q$, $q$text$q$, '2026-10-13 07:14:00'::timestamp, false),
($q$+6285731339148$q$, $q$3EB0E693955FE2B0DD1AE6$q$, $q$outbound$q$, $q$Perkenalkan saya Dzaki Wismadi yang saat ini sedang melakukan riset terkait pengembangan sistem informasi untuk membantu operasional dan administrasi layanan kesehatan, khususnya praktik mandiri dan klinik (FKTP), dengan fokus pada manajemen pasien serta administrasi. Saya ingin mendapatkan masukan langsung dari pengalaman pihak Klinik Pratama Rawat Jalan Albasrah dalam sekitar 20-30 menit melalui agenda tanya-jawab secara online menjadi narasumber.🙏

Untuk hal ini apakah dari pihak klinik  kira-kira berkenan? untuk jadwal menyesuaikan ketersediaan staff admisitrasi/dokter 2-3 hari lagi atau minggu depan ☺️$q$, $q$text$q$, '2026-10-13 07:18:00'::timestamp, false),
($q$+6282232673051$q$, $q$3EB02EE44B40540458B6E2$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Dokter Praktek Mandiri dr Hesty Rosalina'$q$, $q$text$q$, '2026-10-13 07:12:00'::timestamp, false),
($q$+6282232673051$q$, $q$ACAED5BEA366C9E232B52251A32F3AAC$q$, $q$inbound$q$, $q$Selamat siang$q$, $q$text$q$, '2026-10-13 07:13:00'::timestamp, false),
($q$+6282232673051$q$, $q$AC065D4FCF6401F3F435C9D11E1E3261$q$, $q$inbound$q$, $q$Benar, tetapi dokter hesty sudah tidak praktek lagi dan di gantikan oleh rekan nya 🙏🏻🙏🏻$q$, $q$text$q$, '2026-10-13 07:13:01'::timestamp, false),
($q$+6282232673051$q$, $q$AC45B4C1A5FC21D1EAB605EBD0E25A09$q$, $q$inbound$q$, $q$Ada yg bisa di bantu?$q$, $q$text$q$, '2026-10-13 07:13:02'::timestamp, false),
($q$+6282232673051$q$, $q$3EB0D97DCC5634862CB919$q$, $q$outbound$q$, $q$Oh baik, berarti digantikan oleh Dokter siapa nggih?$q$, $q$text$q$, '2026-10-13 07:17:00'::timestamp, false),
($q$+6282232673051$q$, $q$3EB0AB0E1AB196E1E07D1C$q$, $q$inbound$q$, $q$dengan dokter irfan,,$q$, $q$text$q$, '2026-10-13 07:36:00'::timestamp, false),
($q$+6282232673051$q$, $q$3EB0F324B8830F387613B9$q$, $q$inbound$q$, $q$ada yang bisa kami bantu?$q$, $q$text$q$, '2026-10-13 07:36:01'::timestamp, false),
($q$+6282232292366$q$, $q$3EB0F4D903CCD01F60937D$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Pratama Kidal Medis?$q$, $q$text$q$, '2026-10-13 07:13:00'::timestamp, false),
($q$+6282232292366$q$, $q$A5E1DEEC6D1E449EAB3046ECECD851CE$q$, $q$inbound$q$, $q$Terima kasih telah menghubungi Klinik Kidal. Silakan beri tahu apa yang bisa kami bantu.$q$, $q$text$q$, '2026-10-13 07:13:01'::timestamp, false),
($q$+6282141991545$q$, $q$3EB0F8CEF0537E4C16D544$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Pratama Ronggo Husada?$q$, $q$text$q$, '2026-10-13 07:13:00'::timestamp, false),
($q$+6282141991545$q$, $q$A5CCACF7019050089A75435425025E01$q$, $q$inbound$q$, $q$Terima kasih telah menghubungi KLINIK PRATAMA RAWAT INAP RONGGO HUSADA. Silakan beri tahu apa yang dapat kami bantu.$q$, $q$text$q$, '2026-10-13 07:13:01'::timestamp, false),
($q$+6282141991545$q$, $q$3EB08FC9268B8DA77FCE28$q$, $q$inbound$q$, $q$Siang, iya benar Bapak/Ibu$q$, $q$text$q$, '2026-10-13 07:26:00'::timestamp, false),
($q$+6282142971007$q$, $q$3EB035DD0A3F43594655A1$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Amiruddin?$q$, $q$text$q$, '2026-10-13 07:13:00'::timestamp, false),
($q$+6282142971007$q$, $q$ACDE1BBA2755C56666F771AC0C31CB8F$q$, $q$inbound$q$, $q$Selamat siang
Nggih bapak 🙏$q$, $q$text$q$, '2026-10-13 07:31:00'::timestamp, false),
($q$+6282232994248$q$, $q$3EB0078A74011D48CAB17B$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Rumah Bidan Hepi?$q$, $q$text$q$, '2026-10-13 07:12:00'::timestamp, false),
($q$+6282232994248$q$, $q$A5DFD34C86D7B829632E6125AC41A388$q$, $q$inbound$q$, $q$Assalamualaikum, 
Selamat Datang di Rumah Bidan. 
 
Silakan beri tahu apa yang dapat kami bantu 🥰

PRAKTIK BIDAN HEPI
Praktik jam 05.00-21.00
Persalinan 24 jam. 

Baby, Kid's n Mom Care
Treatment dengan perjanjian
🥰

Tinggalkan pesan, kami akan balas secepat mungkin.

Wassalamu'alaikum🥰🤗$q$, $q$text$q$, '2026-10-13 07:12:01'::timestamp, false),
($q$+6281313060650$q$, $q$3EB0DA7EDE81EF04013FF8$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Sahabat Sehat?$q$, $q$text$q$, '2026-10-13 07:12:00'::timestamp, false),
($q$+6281313060650$q$, $q$A50D832C2BBB6AC861C891CA3F922B03$q$, $q$inbound$q$, $q$Terima kasih telah menghubungi Klinik Sahabat Sehat. 
Silakan beri tahu apa yang dapat kami bantu 🥰🙏

Kami melayani pasien Umum, BPJS/KIS 
IGD 24 jam
Pelayanan Rawat Inap 24 jam
Pelayanan drg. Gigi
Senin sampai Sabtu : 08.00-13.00
 * Selasa Kamis Sabtu jam 16.30-19.00
Pelayanan Persalinan 24 jam
USG kandungan : 
senin sampai jumat: 10.00-12.00
Senin&Rabu jam 16.00 -17.00
Minggu&Selasa: 15.00-16.30
EKG setiap hari
Periksa kehamilan, nifas dan KB setiap hari
Laboratorium
Farmasi
🥰🥰$q$, $q$text$q$, '2026-10-13 07:12:01'::timestamp, false),
($q$+6281313060650$q$, $q$A564DB45B33701E345D14BDE9004DC59$q$, $q$inbound$q$, $q$Terima kasih telah menghubungi Klinik Sahabat Sehat. 
Silakan beri tahu apa yang dapat kami bantu 🥰🙏

Kami melayani pasien Umum, BPJS/KIS 
pelayanan dr. Umum 24 jam
pelayanan drg. Gigi
# drg Vena setiap Hari Selasa, Kamis & Sabtu  jam 16.30 - 19.30 wib
#drg Salsabila senin-kamis jam 08.00 sd jam 13.00
pelayanan persalinan 24 jam
USG kandungan
EKG setiap hari
periksa kehamilan, nifas dan KB setiap hari
pelayanan laboratorium

Bila pasien BPJS/KIS
Cukup menunjukkan KTP/BPJS/KIS/Mobile JKN$q$, $q$text$q$, '2026-10-13 07:12:02'::timestamp, false),
($q$+6281313060650$q$, $q$A5ACA07BABFD76F5D13AA1719A67763C$q$, $q$inbound$q$, $q$Nggih benar$q$, $q$text$q$, '2026-10-13 08:01:00'::timestamp, false),
($q$+6285859131921$q$, $q$3EB06DEDDF2E827E89A083$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Praktek Mandiri Bidan Suhartatik?$q$, $q$text$q$, '2026-10-13 07:11:00'::timestamp, false),
($q$+6285859131921$q$, $q$AC961F3BCEF91EC7DD4E8BCFFFEAB9C4$q$, $q$inbound$q$, $q$Selamat siang, iya betul$q$, $q$text$q$, '2026-10-13 07:27:00'::timestamp, false),
($q$+6281325668796$q$, $q$3EB079CF8BA13A379418D7$q$, $q$outbound$q$, $q$Selamat siang Kak Alifa, apakah sudah mulai mencoba menggunakan dan ada pertanyaan terkait sistem kami?$q$, $q$text$q$, '2026-10-13 06:28:00'::timestamp, false),
($q$+6281325668796$q$, $q$A561A9DE2DCCAD1C030E9A13BCBA18C8$q$, $q$inbound$q$, $q$Siang, kemarin sudah coba fitur apoteknya kak. Sudah bisaa
Untuk export data juga aman, cuman saya memang belum coba nambah kasus lagi$q$, $q$text$q$, '2026-10-13 07:09:00'::timestamp, false),
($q$+6281325668796$q$, $q$3A1A8E8B9288EA331A0C$q$, $q$outbound$q$, $q$apakah ada kesulitan dalam penggunaannya kak?$q$, $q$text$q$, '2026-10-13 08:25:00'::timestamp, false),
($q$+6281325668796$q$, $q$3EB0481769312EE5965F78$q$, $q$inbound$q$, $q$aman kak, ga ada kesulitan$q$, $q$text$q$, '2026-10-14 03:53:00'::timestamp, false),
($q$+6281325668796$q$, $q$3A0CA2DC8FAD2181C487$q$, $q$outbound$q$, $q$Selamat siang kak, untuk melanjutkan integrasi perlu mengisi

Nama Lengkap:
Nomor STR :
Nomor SIP (opsional) :
Tempat Praktik: Klinik
Alamat Praktik: Jl.
Nomor WhatsApp:
Email:
Role pemilik akun: Dokter / Admin Klinik / Resepsionis / Apotek

agar sistem kami secara resmi bisa membantu submit ke sistem satusehatnya bersama pihak klinik asy-syifa kak🙏$q$, $q$text$q$, '2026-10-14 05:41:00'::timestamp, false),
($q$+6281325668796$q$, $q$3EB00117683317934858D4$q$, $q$inbound$q$, $q$Nama Lengkap: dr. Suriadie
Nomor STR : 33.1.1.100.4.22.046477
Nomor SIP (opsional) : 33724.57152/DU/03/KS.23.01/0313/IV/2022
Tempat Praktik: Klinik Pratama Asy Syifa
Alamat Praktik: Jl. Kartopuran 241A, Jayengan, Serengan, Surakarta
Nomor WhatsApp: 081325668796
role akunnya jadi satu pakai yang sudah ada kemarin?$q$, $q$text$q$, '2026-10-14 06:47:00'::timestamp, false),
($q$+6281325668796$q$, $q$3A47556B5A3CA008FFA2$q$, $q$outbound$q$, $q$Nama Lengkap: dr. Suriadie
Nomor STR : 33.1.1.100.4.22.046477
Nomor SIP (opsional) : 33724.57152/DU/03/KS.23.01/0313/IV/2022
Tempat Praktik: Klinik Pratama Asy Syifa
Alamat Praktik: Jl. Kartopuran 241A, Jayengan, Serengan, Surakarta
Nomor WhatsApp: 081325668796
role akunnya jadi satu pakai yang sudah ada kemarin?$q$, $q$text$q$, '2026-10-14 07:43:00'::timestamp, false),
($q$+6282142006400$q$, $q$3EB00A70BBC75CFE0A46CC$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Shabira Husada?$q$, $q$text$q$, '2026-10-13 06:50:00'::timestamp, false),
($q$+6282142006400$q$, $q$3EB0118E1BFF1933243C42$q$, $q$inbound$q$, $q$Selamat siang, betul kak$q$, $q$text$q$, '2026-10-13 07:00:00'::timestamp, false),
($q$+6282142006400$q$, $q$3EB052B48545FF613D26EF$q$, $q$inbound$q$, $q$halo, ada yang bisa admin bantu?😊🥰$q$, $q$text$q$, '2026-10-13 07:01:00'::timestamp, false),
($q$+6282142006400$q$, $q$3EB06AA9E1B793A393320C$q$, $q$outbound$q$, $q$Selamat siang, perkenalkan saya Dzaki Wismadi. Saat ini saya sedang melakukan riset terkait pengembangan sistem informasi untuk membantu operasional dan administrasi layanan kesehatan, khususnya praktik mandiri dan klinik.

Saya menemukan melalui Google Maps dan melihat ulasan yang positif dari para pasien. Saya berniat untuk mempelajari lebih jauh mengenai pelayanan dan operasional yang dilakukan Klinik Shabira Husada sehingga ingin meminta waktu sekitar 20–30 menit untuk berdiskusi secara online melalui sesi tanya jawab.

Apakah dari pihak Klinik Shabira Husada berkenan menjadi narasumber? Untuk jadwalnya, saya fleksibel dan dapat menyesuaikan dengan waktu luang staf yang bersangkutan atau dokter, baik 2–3 hari ke depan maupun minggu depan. Terima kasih 🙏☺️$q$, $q$text$q$, '2026-10-13 07:08:00'::timestamp, false),
($q$+6287758564743$q$, $q$3EB0D68B1744FE95D9A458$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer praktik dr.Fery Medika?$q$, $q$text$q$, '2026-10-13 06:34:00'::timestamp, false),
($q$+6287758564743$q$, $q$3EB06CD3F922E0CCC5A5F1$q$, $q$outbound$q$, $q$Selamat siang, perkenalkan saya Dzaki Wismadi. Saat ini saya sedang melakukan riset terkait pengembangan sistem informasi untuk membantu operasional dan administrasi layanan kesehatan, khususnya praktik mandiri dan klinik.

Saya menemukan melalui Google Maps dan melihat ulasan yang positif dari para pasien. Saya berniat untuk mempelajari lebih jauh mengenai pelayanan dan operasional yang dilakukan dr.Fery Medika sehingga ingin meminta waktu sekitar 20–30 menit untuk berdiskusi secara online melalui sesi tanya jawab.

Apakah dari pihak dr.Fery Medika berkenan menjadi narasumber? Untuk jadwalnya, saya fleksibel dan dapat menyesuaikan dengan waktu luang staf yang bersangkutan atau dokter, baik 2–3 hari ke depan maupun minggu depan. Terima kasih 🙏☺️$q$, $q$text$q$, '2026-10-13 07:08:00'::timestamp, false),
($q$+6287758564743$q$, $q$3EB033D28AA1979BFB1F32$q$, $q$inbound$q$, $q$besok bisa WA kembali nggih kak🙏🏻😊$q$, $q$text$q$, '2026-10-13 14:38:00'::timestamp, false),
($q$+6287758564743$q$, $q$3ADC6F2495B2F6CCF0F9$q$, $q$outbound$q$, $q$Selamat siang, ingin menanyakan kembali nggih$q$, $q$text$q$, '2026-10-14 06:57:00'::timestamp, false),
($q$+6287758564743$q$, $q$2A4CE340B35B278CED11$q$, $q$inbound$q$, $q$sebentar nggih mohon di tunggu nggih🙏🏻😊$q$, $q$text$q$, '2026-10-14 07:03:00'::timestamp, false),
($q$+6287758564743$q$, $q$3A9658976D7FFD4761FE$q$, $q$outbound$q$, $q$Baik kak 🙏$q$, $q$text$q$, '2026-10-14 07:43:00'::timestamp, false),
($q$+6287758564743$q$, $q$3EB0AD66A3864CB90361A3$q$, $q$inbound$q$, NULL, $q$image$q$, '2026-10-14 07:46:00'::timestamp, true),
($q$+628113130061$q$, $q$3EB06AF55810C9FE1A54A8$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik PMI Curungrejo?$q$, $q$text$q$, '2026-10-13 06:33:00'::timestamp, false),
($q$+628113130061$q$, $q$AC3E3E1C204D6747E4169661C87ED9E7$q$, $q$inbound$q$, $q$Selamat siang, iya benar ini dengan klinik PMI Curungrejo, apakah ada yang bisa dibantu kak 🙏$q$, $q$text$q$, '2026-10-13 06:34:00'::timestamp, false),
($q$+628113130061$q$, $q$3EB0FD74E30A6F6B83BE13$q$, $q$outbound$q$, $q$Perkenalkan saya Dzaki Wismadi yang saat ini sedang melakukan riset terkait pengembangan sistem informasi untuk membantu operasional dan administrasi layanan kesehatan, khususnya praktik mandiri dan klinik (FKTP), dengan fokus pada manajemen pasien serta administrasi. Saya ingin mendapatkan masukan langsung dari pengalaman pihak Klinik PMI Curungrejo dalam sekitar 20-30 menit melalui agenda tanya-jawab secara online menjadi narasumber.🙏

Untuk hal ini apakah dari pihak praktik  kira-kira berkenan? untuk jadwal menyesuaikan ketersediaan staff admisitrasi/dokter 2-3 hari lagi atau minggu depan ☺️$q$, $q$text$q$, '2026-10-13 06:43:00'::timestamp, false),
($q$+628113130061$q$, $q$AC4C641E959E1BF4DBFC087B80317128$q$, $q$inbound$q$, $q$Kami sampaikan dulu kepada managemen ya kak$q$, $q$text$q$, '2026-10-13 07:06:00'::timestamp, false),
($q$+628113130061$q$, $q$3A9E45E29C4D50BF7770$q$, $q$outbound$q$, $q$Baik, Mohon kabari saya jika sudah ada informasi terbaru  🙏$q$, $q$text$q$, '2026-10-13 07:32:00'::timestamp, false),
($q$+6282333373233$q$, $q$3EB0A74EAB3E7A801E4CEC$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Dr.Marwoto Health Center?$q$, $q$text$q$, '2026-10-13 06:50:00'::timestamp, false),
($q$+6282333373233$q$, $q$ACBF04E6DE7AEA66D36F119F3EF16D02$q$, $q$inbound$q$, $q$Selamat siang, benar Kak 😊 Ini nomor resmi Klinik Pratama dr. Marwoto Health Center. Ada yang bisa kami bantu, Kak? 🙏$q$, $q$text$q$, '2026-10-13 06:53:00'::timestamp, false),
($q$+6282333373233$q$, $q$3EB02381A8FF9512F78813$q$, $q$outbound$q$, $q$Selamat siang, perkenalkan saya Dzaki Wismadi. Saat ini saya sedang melakukan riset terkait pengembangan sistem informasi untuk membantu operasional dan administrasi layanan kesehatan, khususnya praktik mandiri dan klinik.

Saya menemukan melalui Google Maps dan melihat ulasan yang positif dari para pasien. Saya berniat untuk mempelajari lebih jauh mengenai pelayanan dan operasional yang dilakukan Dr.Marwoto Health Center sehingga ingin meminta waktu sekitar 20–30 menit untuk berdiskusi secara online melalui sesi tanya jawab.

Apakah dari pihak Dr.Marwoto Health Center berkenan menjadi narasumber? Untuk jadwalnya, saya fleksibel dan dapat menyesuaikan dengan waktu luang staf yang bersangkutan atau dokter, baik 2–3 hari ke depan maupun minggu depan. Terima kasih 🙏☺️$q$, $q$text$q$, '2026-10-13 07:06:00'::timestamp, false),
($q$+6285755496575$q$, $q$3EB0A4599450C07C4BEE9D$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Jaya Kusuma Husada?$q$, $q$text$q$, '2026-10-13 06:33:00'::timestamp, false),
($q$+6285755496575$q$, $q$A522C85CCA3524ACDC6A11E6C8B4A201$q$, $q$inbound$q$, $q$Nggih$q$, $q$text$q$, '2026-10-13 06:50:00'::timestamp, false),
($q$+6285755496575$q$, $q$3EB02B87EA58B6181E6AAE$q$, $q$outbound$q$, $q$Selamat siang, perkenalkan saya Dzaki Wismadi. Saat ini saya sedang melakukan riset terkait pengembangan sistem informasi untuk membantu operasional dan administrasi layanan kesehatan, khususnya praktik mandiri dan klinik.

Saya menemukan melalui Google Maps dan melihat ulasan yang positif dari para pasien. Saya berniat untuk mempelajari lebih jauh mengenai pelayanan dan operasional yang dilakukan Klinik Jaya Kusuma Husada sehingga ingin meminta waktu sekitar 20–30 menit untuk berdiskusi secara online melalui sesi tanya jawab.

Apakah dari pihak Klinik Jaya Kusuma Husada berkenan menjadi narasumber? Untuk jadwalnya, saya fleksibel dan dapat menyesuaikan dengan waktu luang staf yang bersangkutan atau dokter, baik 2–3 hari ke depan maupun minggu depan. Terima kasih 🙏☺️$q$, $q$text$q$, '2026-10-13 07:05:00'::timestamp, false),
($q$+6282321666060$q$, $q$3EB06BC20D9238B750866B$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Praktek Dokter Dinar?$q$, $q$text$q$, '2026-10-13 06:49:00'::timestamp, false),
($q$+6282321666060$q$, $q$A5DF8D6D4F5BBF1CB76642BC6E283951$q$, $q$inbound$q$, $q$Selamat siang$q$, $q$text$q$, '2026-10-13 06:50:00'::timestamp, false),
($q$+6282321666060$q$, $q$A50C7017AC8CAC40920B41D1FACBC330$q$, $q$inbound$q$, $q$Iya benar kak$q$, $q$text$q$, '2026-10-13 06:50:01'::timestamp, false),
($q$+6282321666060$q$, $q$A5A3BBB0DDFF1F771680116A8643A5E1$q$, $q$inbound$q$, $q$Ada yg bisa dibantu?$q$, $q$text$q$, '2026-10-13 06:50:02'::timestamp, false),
($q$+6282321666060$q$, $q$3EB0C772ACAE901CD6E9C9$q$, $q$outbound$q$, $q$Selamat siang, perkenalkan saya Dzaki Wismadi. Saat ini saya sedang melakukan riset terkait pengembangan sistem informasi untuk membantu operasional dan administrasi layanan kesehatan, khususnya praktik mandiri dan klinik.

Saya menemukan melalui Google Maps dan melihat ulasan yang positif dari para pasien. Saya berniat untuk mempelajari lebih jauh mengenai pelayanan dan operasional yang dilakukan Praktek Dokter Dinar sehingga ingin meminta waktu sekitar 20–30 menit untuk berdiskusi secara online melalui sesi tanya jawab.

Apakah dari pihak Praktek Dokter Dinar berkenan menjadi narasumber? Untuk jadwalnya, saya fleksibel dan dapat menyesuaikan dengan waktu luang staf yang bersangkutan atau dokter, baik 2–3 hari ke depan maupun minggu depan. Terima kasih 🙏☺️$q$, $q$text$q$, '2026-10-13 07:04:00'::timestamp, false),
($q$+6285100051952$q$, $q$3EB039C0773AFD50C37E6E$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Praktik Dokter Harjono?$q$, $q$text$q$, '2026-10-13 06:52:00'::timestamp, false),
($q$+6285100051952$q$, $q$3A91CEB668DFCB0D6BD9$q$, $q$inbound$q$, $q$Ya$q$, $q$text$q$, '2026-10-13 08:40:00'::timestamp, false),
($q$+6281330052934$q$, $q$3EB06B891A5F2ECDCBF4F5$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Yudhistira Medika?$q$, $q$text$q$, '2026-10-13 06:51:00'::timestamp, false),
($q$+6281330052934$q$, $q$A5E8EF7D44E6845AE6D1403032298C36$q$, $q$inbound$q$, $q$Terima kasih telah menghubungi Klinik Yudhistira Medika Malang. Silahkan beri tahu apa yang bisa kami bantu.
Jangan lupa simpan nomor kontak ini untuk mendapatkan informasi dan promosi kesehatan terkini di klinik kami.
Terima kasih 😊🙏$q$, $q$text$q$, '2026-10-13 06:51:01'::timestamp, false),
($q$+6281330052934$q$, $q$A5EFCE1757DF1AE613B858FE3F09A76D$q$, $q$inbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Yudhistira Medika?$q$, $q$text$q$, '2026-10-13 09:43:00'::timestamp, false),
($q$+6282220505009$q$, $q$3EB061E41AA8D0533ADF0F$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Syifa Husada Unggul?$q$, $q$text$q$, '2026-10-13 06:51:00'::timestamp, false),
($q$+6282131032148$q$, $q$3EB0322DFE4BA3E22C44E0$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Praktek Dokter Umum Klayatan?$q$, $q$text$q$, '2026-10-13 06:50:00'::timestamp, false),
($q$+6282131032148$q$, $q$ACA8833606E6F273F95A1BED6A1A05F9$q$, $q$inbound$q$, $q$Selamat sore,kami buka dari jam 15.00 - 21.00 WIB
untuk dokter ada sekitr jm 17.00 - 21.00 WIB🙏🏻$q$, $q$text$q$, '2026-10-13 08:14:00'::timestamp, false),
($q$+6282131032148$q$, $q$ACBA31903B6DA4E4EB1ED28153DFF20C$q$, $q$inbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Praktek Dokter Umum Klayatan?$q$, $q$text$q$, '2026-10-13 08:14:01'::timestamp, false),
($q$+62881036858686$q$, $q$3EB09E2819E0E6E01843C9$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Pratama Astagina Medika?$q$, $q$text$q$, '2026-10-13 06:50:00'::timestamp, false),
($q$+62881036858686$q$, $q$3EB0776C7F1A54CF9EDEB0$q$, $q$inbound$q$, $q$iya, ada yang bisa dibantu kak🙏🏻$q$, $q$text$q$, '2026-10-13 08:35:00'::timestamp, false),
($q$+6289675873994$q$, $q$3EB06A0516ADB0C19822F1$q$, $q$inbound$q$, $q$terimakasih, kami lanjutkan ke bagian terkait. 
akan kami informasikan jika sudah ada konfirmasi ya kak$q$, $q$text$q$, '2026-10-13 01:45:00'::timestamp, false),
($q$+6289675873994$q$, $q$A5DD4D06867947F6194EB0D6ADFC3763$q$, $q$inbound$q$, $q$Dari pimpinan menanyakan kak untuk programnya nanti akan masuk di eRMnya klinik atau terpisah ya?$q$, $q$text$q$, '2026-10-13 02:06:00'::timestamp, false),
($q$+6289675873994$q$, $q$3EB0CA16B10A423CBF1CEC$q$, $q$outbound$q$, $q$Untuk proses wawancara ini, saya tidak menjalankan programnya kak. hanya bersifat tanya jawab terkait pengalaman penggunaan eRM yang ada di klinik pratama UNIMUS sekitar 15 menit (Alur pelayanan pasien, fitur yang dibutuhkan atau kendala penggunaan rekam medis,... dan sebagainya)

lalu sekitar 5 menit saya memperlihatkan rancangan sistem kami dan meminta feedback komen menurut pengalaman pihak klinik sistem kami apakah mudah dipahami dan sesuai untuk dikolaborasikan (apakah mungkin terlalu kompleks, apakah mungkin belum terlalu dibutuhkan masyarakat,.. dan sebagainya) 

kurang lebih seperti itu kak  ☺️$q$, $q$text$q$, '2026-10-13 03:43:00'::timestamp, false),
($q$+6289675873994$q$, $q$A5F63C3E9BD4217128AF44F074A6649A$q$, $q$inbound$q$, $q$Terima kasih infonya$q$, $q$text$q$, '2026-10-13 04:02:00'::timestamp, false),
($q$+6289675873994$q$, $q$3EB054C44859B081779B84$q$, $q$outbound$q$, $q$Dari pihak klinik apakah berkenan kak untuk jadi salah satu narasumber kami?$q$, $q$text$q$, '2026-10-13 06:49:00'::timestamp, false),
($q$+6289675873994$q$, $q$3EB068A262FFE256077025$q$, $q$inbound$q$, $q$blm ada jawaban dari pimpinan, mohon di tunggu$q$, $q$text$q$, '2026-10-13 07:55:00'::timestamp, false),
($q$+6289675873994$q$, $q$3A3237B2088C658BD309$q$, $q$outbound$q$, $q$Baik, Mohon kabari saya jika sudah ada informasi terbaru  🙏$q$, $q$text$q$, '2026-10-13 08:06:00'::timestamp, false),
($q$+6289675873994$q$, $q$3EB04EB779C479DEC734CC$q$, $q$inbound$q$, $q$njih$q$, $q$text$q$, '2026-10-14 01:15:00'::timestamp, false),
($q$+6285333339950$q$, $q$3EB0B082D166FE1B44CE78$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Pratama Yassa Husada?$q$, $q$text$q$, '2026-10-13 06:33:00'::timestamp, false),
($q$+6285333339950$q$, $q$A5C208F6003AEE704E4E8EA86458EB78$q$, $q$inbound$q$, $q$Terima kasih telah menghubungi Yassa Husada. Silakan beri tahu apa yang dapat kami bantu.
Yassa Husada Melayani Seperti Keluarga😊$q$, $q$text$q$, '2026-10-13 06:33:01'::timestamp, false),
($q$+6285333339950$q$, $q$3EB01FA81CCE8BAAB3F9C2$q$, $q$outbound$q$, $q$Selamat siang, perkenalkan saya Dzaki Wismadi. Saat ini saya sedang melakukan riset terkait pengembangan sistem informasi untuk membantu operasional dan administrasi layanan kesehatan, khususnya praktik mandiri dan klinik.

Saya menemukan melalui Google Maps dan melihat ulasan yang positif dari para pasien. Saya berniat untuk mempelajari lebih jauh mengenai pelayanan dan operasional yang dilakukan Klinik Pratama Rawat sehingga ingin meminta waktu sekitar 20–30 menit untuk berdiskusi secara online melalui sesi tanya jawab.

Apakah dari pihak Klinik Pratama Rawat berkenan menjadi narasumber? Untuk jadwalnya, saya fleksibel dan dapat menyesuaikan dengan waktu luang staf yang bersangkutan atau dokter, baik 2–3 hari ke depan maupun minggu depan. Terima kasih 🙏☺️$q$, $q$text$q$, '2026-10-13 06:48:00'::timestamp, false),
($q$+628113636977$q$, $q$3EB02B0192F67F8001D6A2$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Ketawang Medis?$q$, $q$text$q$, '2026-10-13 06:34:00'::timestamp, false),
($q$+628113636977$q$, $q$A53DDDB42757535849C283F8543CB573$q$, $q$inbound$q$, $q$Terima kasih telah menghubungi KETAWANG MEDIS. Silakan beri tahu apa yang dapat kami bantu.$q$, $q$text$q$, '2026-10-13 06:34:01'::timestamp, false),
($q$+628113636977$q$, $q$A5C0F42A8F72F5C7D6BC81F084D28427$q$, $q$inbound$q$, $q$Iya$q$, $q$text$q$, '2026-10-13 06:35:00'::timestamp, false),
($q$+628113636977$q$, $q$A5689E317775B4A8FE99879651FD045B$q$, $q$inbound$q$, $q$Ada yang bisa kami bantu kak?$q$, $q$text$q$, '2026-10-13 06:35:01'::timestamp, false),
($q$+628113636977$q$, $q$3EB07A519A2306A716122D$q$, $q$outbound$q$, $q$Selamat siang, perkenalkan saya Dzaki Wismadi. Saat ini saya sedang melakukan riset terkait pengembangan sistem informasi untuk membantu operasional dan administrasi layanan kesehatan, khususnya praktik mandiri dan klinik.

Saya menemukan melalui Google Maps dan melihat ulasan yang positif dari para pasien. Saya berniat untuk mempelajari lebih jauh mengenai pelayanan dan operasional yang dilakukan Ketawang Medis sehingga ingin meminta waktu sekitar 20–30 menit untuk berdiskusi secara online melalui sesi tanya jawab.

Apakah dari pihak Ketawang Medis berkenan menjadi narasumber? Untuk jadwalnya, saya fleksibel dan dapat menyesuaikan dengan waktu luang staf yang bersangkutan atau dokter, baik 2–3 hari ke depan maupun minggu depan. Terima kasih 🙏☺️$q$, $q$text$q$, '2026-10-13 06:43:00'::timestamp, false),
($q$+628113636977$q$, $q$A53E8FBF22E51CCDA3CE794B1A744CBA$q$, $q$inbound$q$, $q$Mohon maaf kak, bisa chat langsung dengan owner kami atau manager kami ya$q$, $q$text$q$, '2026-10-13 06:44:00'::timestamp, false),
($q$+628113636977$q$, $q$A5632A5D47C9BB5D3CB6FF7EC836B7EB$q$, $q$inbound$q$, $q$Saya hanya admin per kliniknya$q$, $q$text$q$, '2026-10-13 06:44:01'::timestamp, false),
($q$+628113636977$q$, $q$A5E0534AE570DED910FD81365BACF897$q$, $q$inbound$q$, NULL, $q$sticker$q$, '2026-10-13 06:44:02'::timestamp, true),
($q$+628113636977$q$, $q$3EB03E89DE507010487062$q$, $q$outbound$q$, $q$apakah ada kontak yang bisa saya hubungi kak?$q$, $q$text$q$, '2026-10-13 06:47:00'::timestamp, false),
($q$+6281233923999$q$, $q$3EB02BE313237BA39702DB$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Klinik Dr Dian Agung Anggraeny?$q$, $q$text$q$, '2026-10-13 06:33:00'::timestamp, false),
($q$+6281233923999$q$, $q$ACB49F60874A551499CF47E78462F117$q$, $q$inbound$q$, $q$Iya$q$, $q$text$q$, '2026-10-13 06:33:01'::timestamp, false),
($q$+6281233923999$q$, $q$AC37DEBC5C8969F75B27488DC2225BA3$q$, $q$inbound$q$, $q$Ada yang bisa dibantu kak$q$, $q$text$q$, '2026-10-13 06:34:00'::timestamp, false),
($q$+6281233923999$q$, $q$3EB0E8E8D18B34F7439C64$q$, $q$outbound$q$, $q$Selamat siang, perkenalkan saya Dzaki Wismadi. Saat ini saya sedang melakukan riset terkait pengembangan sistem informasi untuk membantu operasional dan administrasi layanan kesehatan, khususnya praktik mandiri dan klinik.

Saya menemukan melalui Google Maps dan melihat ulasan yang positif dari para pasien. Saya berniat untuk mempelajari lebih jauh mengenai pelayanan dan operasional yang dilakukan Klinik Dr Dian Agung Anggraeny sehingga ingin meminta waktu sekitar 20–30 menit untuk berdiskusi secara online melalui sesi tanya jawab.

Apakah dari pihak Klinik Dr Dian Agung Anggraeny berkenan menjadi narasumber? Untuk jadwalnya, saya fleksibel dan dapat menyesuaikan dengan waktu luang staf yang bersangkutan atau dokter, baik 2–3 hari ke depan maupun minggu depan. Terima kasih 🙏☺️$q$, $q$text$q$, '2026-10-13 06:39:00'::timestamp, false),
($q$+6281233923999$q$, $q$AC488C08344637FEA9E5AA3579092287$q$, $q$inbound$q$, $q$Dari mana ya ini?
Akademisi atau mana?$q$, $q$text$q$, '2026-10-13 06:40:00'::timestamp, false),
($q$+6281233923999$q$, $q$3EB06607873F0FE87954DA$q$, $q$outbound$q$, $q$Berkaitan dengan pesan saya sebelumnya, saya dari startup https://www.sahaibat.com/ yang sebelumnya kami bekerja sama pada program CSR membangun sistem Kesehatan di daerah NTT

Lalu kami berencana melanjutkan program kolaborasi dengan badan FKTP (klinik/praktik mandiri) di sekitar Jawa dalam pembangan sistem manajemen fasilitas kesehatan, tapi dalam prosesnya saya ditugaskan untuk riset ke lapangan bagaimana sistem yang sudah diadopsi di masyarakat. 

pertanyaan kurang lebih seperti:
Alur pasien mulai dari pendaftaran hingga selesai konsultasi;
Proses penjadwalan dan pencatatan rekam medis;
Sistem digital atau pencatatan manual yang saat ini digunakan;
Kendala atau kebutuhan yang masih dirasakan dalam proses tersebut.

Apakah pihak klinik berkenan menjadi salah satu narasumber kami🙏?$q$, $q$text$q$, '2026-10-13 06:44:00'::timestamp, false),
($q$+6281222677717$q$, $q$3AEF6541D01F2ED66CE9$q$, $q$outbound$q$, $q$dengan diwakili staff adminstrasi dulu bisa kak$q$, $q$text$q$, '2026-10-14 04:58:00'::timestamp, false),
($q$+6281222677717$q$, $q$3A345D22AE3C2D1E584B$q$, $q$outbound$q$, $q$kalau dari kakak bisa dengan suara call, namun saya akan dengan video$q$, $q$text$q$, '2026-10-14 04:58:01'::timestamp, false),
($q$+6281222677717$q$, $q$3EB0FC3772D31D46E9E5C0$q$, $q$inbound$q$, $q$yang di tanyakan mengenai apa saja kak ?$q$, $q$text$q$, '2026-10-14 04:59:00'::timestamp, false),
($q$+6281222677717$q$, $q$3A3DA52248E8A7AD5732$q$, $q$outbound$q$, $q$pertanyaan kurang lebih seperti:
•⁠  ⁠Alur pasien mulai dari pendaftaran hingga selesai konsultasi;
•⁠  ⁠Proses penjadwalan dan pencatatan rekam medis;
•⁠  ⁠Sistem digital atau pencatatan manual yang saat ini digunakan;
•⁠  ⁠Kendala atau kebutuhan yang masih dirasakan dalam proses tersebut.$q$, $q$text$q$, '2026-10-14 05:00:00'::timestamp, false),
($q$+6281222677717$q$, $q$3EB07ACA01F95ECB4B31EE$q$, $q$inbound$q$, $q$kalau nanti mau sama dokternya juga, nanti sore ada jadwalnya dr samsul kak selaku owner klinik ghania$q$, $q$text$q$, '2026-10-14 05:00:01'::timestamp, false),
($q$+6281222677717$q$, $q$3A0E1D92091C335B241B$q$, $q$outbound$q$, $q$kalau nanti mau sama dokternya juga, nanti sore ada jadwalnya dr samsul kak selaku owner klinik ghania$q$, $q$text$q$, '2026-10-14 05:01:00'::timestamp, false),
($q$+6281222677717$q$, $q$3EB0851D696D83A2E570CD$q$, $q$inbound$q$, $q$kurang lebih jadwal dr samsul sore sekitar jam 16.00-20.00$q$, $q$text$q$, '2026-10-14 05:01:01'::timestamp, false),
($q$+6281222677717$q$, $q$3AFCEE99012008F47758$q$, $q$outbound$q$, $q$kurang lebih jadwal dr samsul sore sekitar jam 16.00-20.00$q$, $q$text$q$, '2026-10-14 05:02:00'::timestamp, false),
($q$+6281222677717$q$, $q$3EB0DFEE3DB7FCC59DCAD2$q$, $q$inbound$q$, $q$maaf kak sebelumnya, wawancara hari ini ditujukan sebagai tugas akhir atau keperluan lain kak ?$q$, $q$text$q$, '2026-10-14 05:03:00'::timestamp, false),
($q$+6281222677717$q$, $q$3EB0356D2C7DF9EDF09052$q$, $q$inbound$q$, $q$nggih benar kak, dr samsul hari ini ada jadwal praktek$q$, $q$text$q$, '2026-10-14 05:03:01'::timestamp, false),
($q$+6281222677717$q$, $q$3AF554B12980099F578A$q$, $q$outbound$q$, $q$maaf kak sebelumnya, wawancara hari ini ditujukan sebagai tugas akhir atau keperluan lain kak ?$q$, $q$text$q$, '2026-10-14 05:04:00'::timestamp, false),
($q$+6281222677717$q$, $q$3EB0C061B14E721C9EB0D2$q$, $q$inbound$q$, $q$baik kak, ijin saya lanjutkan pesan ini ke dr samsul nggih. barang kali nanti berkenan dg beliau nanti bisa diaturkan sesi tanya jawab dengan perawat yang jaga sore kak$q$, $q$text$q$, '2026-10-14 05:07:00'::timestamp, false),
($q$+6281222677717$q$, $q$3AA9815DF81BF7F93BFD$q$, $q$outbound$q$, $q$baik kak, berarti yang jam 12 ini apakah tidak jadi nggih?$q$, $q$text$q$, '2026-10-14 05:07:01'::timestamp, false),
($q$+6281222677717$q$, $q$3EB0136E5B26458591EF99$q$, $q$inbound$q$, $q$bisa, dengan staf dulu nggih niki$q$, $q$text$q$, '2026-10-14 05:08:00'::timestamp, false),
($q$+6281222677717$q$, $q$3A982AECEC78E70578A1$q$, $q$outbound$q$, $q$Halo kak, izin menanyakan ulang waktu senggang jam 12.00 nanti nggih. Jika iya berikut link pertemuan online dari kami
https://meet.google.com/ohb-zkex-rrf$q$, $q$text$q$, '2026-10-14 05:09:00'::timestamp, false),
($q$+6281222677717$q$, $q$A584843CDA0A6F7AE98141B87AAFCD06$q$, $q$inbound$q$, $q$Mohon maaf kak, sudah saya konfrimasi ke dr samsul beliau mengatakan tidak bisa. Jadi untuk sesi tanya jawabnya masih belum bisa dilakukan sekarang. Mohon maaf kak🙏$q$, $q$text$q$, '2026-10-14 05:17:00'::timestamp, false),
($q$+6281222677717$q$, $q$A5FE32D4B2F15699F215AA95E1E3BC80$q$, $q$inbound$q$, $q$Untuk saat ini dr samsul masih belum bisa melakukan sesi tanyanya 🙏$q$, $q$text$q$, '2026-10-14 05:18:00'::timestamp, false),
($q$+6281222677717$q$, $q$3A3AA63573D08DDBEFDA$q$, $q$outbound$q$, $q$baik kak, apakah harus ada surat pengantar resmi atau apa ya kak agar dari saya bisa melakukan tanya jawab?$q$, $q$text$q$, '2026-10-14 05:20:00'::timestamp, false),
($q$+6281222677717$q$, $q$3EB04CE0AD182EE34F22B2$q$, $q$inbound$q$, $q$Mohon maaf kak untuk saat ini dr samsul masih belum ada waktu, semoga bisa di lain kesempatan . Mohon maaf dan terima kasih kak🙏🏻$q$, $q$text$q$, '2026-10-14 07:49:00'::timestamp, false),
($q$+6281222677717$q$, $q$3ACB17BD744F697A63E3$q$, $q$outbound$q$, $q$Oh baik kak, sebelumnya kalau boleh tau untuk klinik ini rekam medis apakah sudah menggunakan digital atau pembukuan kertas ya?$q$, $q$text$q$, '2026-10-14 08:18:00'::timestamp, false),
($q$+6281222677717$q$, $q$3EB0330D3506984420707F$q$, $q$inbound$q$, $q$enggeh bolehh,, di sini sudah pakai digital kak$q$, $q$text$q$, '2026-10-14 08:20:00'::timestamp, false),
($q$+6281222677717$q$, $q$3A14F50BA4E5E94E037D$q$, $q$outbound$q$, $q$untuk yang mengakses sistem tersebut apakah hanya dokter atau ada staff lain yang ikut menggunakan nggih?$q$, $q$text$q$, '2026-10-14 08:21:00'::timestamp, false),
($q$+6281222677717$q$, $q$A58B2A9ADC3AF4245EC4BEBC601CA6E1$q$, $q$inbound$q$, $q$Bisa langsung ke dr nya juga si kak
Karena sedikit banyak juga drnya tau tentang sistem karena yg memegang seblumnya juga dr nya sendiri sebelum ada staff lainnya$q$, $q$text$q$, '2026-10-14 08:22:00'::timestamp, false),
($q$+6282257755991$q$, $q$3EB02C55D745FE712D1AFB$q$, $q$outbound$q$, $q$Selamat Siang, apakah benar ini kontak nomer Praktek Keperawatan Mandiri Andri Suhartono?$q$, $q$text$q$, '2026-10-13 06:32:00'::timestamp, false),
($q$+6282257755991$q$, $q$3AC05FBDD64ED81A18DA$q$, $q$inbound$q$, $q$Selamat siang iya pak, mohon maaf ini dengan siapa dan ada perlu apa nggeh?$q$, $q$text$q$, '2026-10-13 06:34:00'::timestamp, false),
($q$+6282257755991$q$, $q$3EB0B3E1920F1254B8846C$q$, $q$outbound$q$, $q$Perkenalkan saya Dzaki Wismadi yang saat ini sedang melakukan riset terkait pengembangan sistem informasi untuk membantu operasional dan administrasi layanan kesehatan, khususnya praktik mandiri dan klinik (FKTP), dengan fokus pada manajemen pasien serta administrasi. Saya ingin mendapatkan masukan langsung dari pengalaman pihak Praktek Keperawatan Mandiri Andri Suhartono dalam sekitar 20-30 menit melalui agenda tanya-jawab secara online menjadi narasumber.🙏

Untuk hal ini apakah dari pihak praktik kira-kira berkenan? untuk jadwal menyesuaikan ketersediaan staff admisitrasi/Pak Andri 2-3 hari lagi atau minggu depan ☺️$q$, $q$text$q$, '2026-10-13 06:41:00'::timestamp, false),
($q$+628113111492$q$, $q$A5729CF6758638A38C64D718D434C0CC$q$, $q$inbound$q$, $q$Selamat pagi mas$q$, $q$text$q$, '2026-10-13 02:13:00'::timestamp, false),
($q$+628113111492$q$, $q$A59C86104DEB723DE82A5359E7DA11B3$q$, $q$inbound$q$, $q$Monggo sekarang sy senggang$q$, $q$text$q$, '2026-10-13 02:13:01'::timestamp, false),
($q$+628113111492$q$, $q$3EB0A2AA0756A70E8A383B$q$, $q$outbound$q$, $q$pagi mbak, mohon maaf baru menjawab karena dari saya baru siap-siap. jika di jam 10 apakah senggang mbak?$q$, $q$text$q$, '2026-10-13 02:56:00'::timestamp, false),
($q$+628113111492$q$, $q$A5C288E1AA71C459F395B0FAD7CCFF48$q$, $q$inbound$q$, $q$Monggo mas mumpung dokter belum atang$q$, $q$text$q$, '2026-10-13 03:05:00'::timestamp, false),
($q$+628113111492$q$, $q$3EB0E15BEEC5975612D1C6$q$, $q$outbound$q$, $q$baik segera saya kirim linknya$q$, $q$text$q$, '2026-10-13 03:06:00'::timestamp, false),
($q$+628113111492$q$, $q$3EB0A754DA2712C9751CA4$q$, $q$outbound$q$, $q$https://meet.google.com/uuh-ewca-xct berikut linknya nggih$q$, $q$text$q$, '2026-10-13 03:08:00'::timestamp, false),
($q$+628113111492$q$, $q$A5B901AA2D2D12DBC9E5D11C015F5BF6$q$, $q$inbound$q$, $q$Mungkin ada file yg mau disampaikan ke dokter mas?$q$, $q$text$q$, '2026-10-13 05:29:00'::timestamp, false),
($q$+628113111492$q$, $q$3EB0F754958D41F5555552$q$, $q$outbound$q$, $q$Mungkin inti pesan yang perlu bantuan untuk disampaikan ke Dr Daniel
Kami dari https://www.sahaibat.com/id ingin mengembangkan ekosistem digital di ranah dunia Kesehatan Indonesia
Kami belum ingin komersil terdekat ini, sedang mencari mitra praktik mandiri/klinik yang ingin menggunakan sistem kami (Rekam Medis dengan AI) dan membutuhkan feedback mitra apakah sistem kami digunakan nyaman atau tidaknya. kami berikan akses ke sistem kami selama 1 tahun tapi jika misal dalam pemakaian 1-2 minggu dan merasa kurang cocok, bisa kabari kami jika ingin berhenti menggunakan 
Apabila Dokter Daniel sibuk, sistem kami sebenarnya juga dirancang untuk Kak Ria yang membantu pekerjaan staff admin rekam medis

Ini dulu kak yang mungkin dari kami, terima kasih sebelumnya$q$, $q$text$q$, '2026-10-13 06:25:00'::timestamp, false),
($q$+628113111492$q$, $q$A51A94EBC3ADA8E05A0B7967DCAC7193$q$, $q$inbound$q$, $q$Baik akan kami sampaikan 🙏$q$, $q$text$q$, '2026-10-13 12:36:00'::timestamp, false),
($q$+628113111492$q$, $q$3A8C8D78F2515938EAC0$q$, $q$outbound$q$, $q$Baik kak, apakah sudah ada respon dari Dr Daniel?$q$, $q$text$q$, '2026-10-14 06:58:00'::timestamp, false),
($q$+628113111492$q$, $q$A502B6684A0726E4AC0918605084FB92$q$, $q$inbound$q$, $q$Maaf sebentar iya mas, admin nya sekarang libur🙏$q$, $q$text$q$, '2026-10-14 07:07:00'::timestamp, false),
($q$+628113111492$q$, $q$3A23B9D7BEB51366B2D3$q$, $q$outbound$q$, $q$Baik kak 🙏$q$, $q$text$q$, '2026-10-14 07:43:00'::timestamp, false),
($q$+628113111492$q$, $q$A5C4F1E669540D56083E2C353FF19379$q$, $q$inbound$q$, $q$Maaf mas masih belom ada respon dari p. Dokter$q$, $q$text$q$, '2026-10-14 08:20:00'::timestamp, false),
($q$+628815883288$q$, $q$3EB05F41F787783419B9BA$q$, $q$outbound$q$, $q$Maaf baru menjawab Dok, dari kami bisa nggih$q$, $q$text$q$, '2026-10-13 03:45:00'::timestamp, false),
($q$+628815883288$q$, $q$AC5BA993360D830CAE80D4ABEBA80E1D$q$, $q$inbound$q$, NULL, $q$image$q$, '2026-10-13 09:18:00'::timestamp, true),
($q$+6285655718382$q$, $q$3EB0C2B316829AC352BDC8$q$, $q$inbound$q$, $q$selamat pagi, kalau boleh tau untuk keperluan apa nggih$q$, $q$text$q$, '2026-10-13 01:03:00'::timestamp, false),
($q$+6285655718382$q$, $q$3EB0636CD7314BD21C7736$q$, $q$outbound$q$, $q$Berkaitan dengan pesan saya sebelumnya, saya dari startup https://www.sahaibat.com/ yang sebelumnya kami bekerja sama pada program CSR membangun sistem Kesehatan di daerah NTT

Lalu kami berencana melanjutkan program kolaborasi dengan badan FKTP (klinik/praktik mandiri) di sekitar Jawa dalam pembangan sistem manajemen fasilitas kesehatan, tapi dalam prosesnya saya ditugaskan untuk riset ke lapangan bagaimana sistem yang sudah diadopsi di masyarakat. 

pertanyaan kurang lebih seperti:
Alur pasien mulai dari pendaftaran hingga selesai konsultasi;
Proses penjadwalan dan pencatatan rekam medis;
Sistem digital atau pencatatan manual yang saat ini digunakan;
Kendala atau kebutuhan yang masih dirasakan dalam proses tersebut.

Apakah pihak klinik berkenan menjadi salah satu narasumber kami🙏?$q$, $q$text$q$, '2026-10-13 03:44:00'::timestamp, false),
($q$+6281329304257$q$, $q$3EB0B0883D35352EC5179E$q$, $q$outbound$q$, $q$Baik Dok, apabila ada pertanyaan bisa langsung tanyakan ke saya nggih☺️$q$, $q$text$q$, '2026-10-13 03:37:00'::timestamp, false),
($q$+6285138585992$q$, $q$3EB01919E49CB1D64CCDC9$q$, $q$inbound$q$, $q$Belum ada info dari manajemen kak 🙏🏻$q$, $q$text$q$, '2026-10-13 02:51:00'::timestamp, false);

-- Pengaman: pesan di file yang waktunya <= pesan terakhir yang SUDAH ada di CRM seharusnya tumpang-tindih.
DO $guard$
DECLARE overlap int; matched int;
BEGIN
  SELECT count(*) INTO overlap FROM bf b
   WHERE b.sent_at <= (SELECT max(m.sent_at) FROM wa_messages m JOIN wa_contacts c ON c.id = m.wa_contact_id WHERE c.phone_normalized = b.phone);
  SELECT count(*) INTO matched FROM bf b WHERE EXISTS (SELECT 1 FROM wa_messages m WHERE m.wa_message_id = b.mid);
  RAISE NOTICE 'pesan di zona tumpang-tindih: %, ID yang sudah ada di CRM: %', overlap, matched;
  IF overlap >= 5 AND matched = 0 THEN
    RAISE EXCEPTION 'Ada % pesan di zona tumpang-tindih tapi 0 ID cocok -> format ID WA Web berbeda dari CRM, import dibatalkan agar tidak dobel', overlap;
  END IF;
END $guard$;

-- Kontak yang nomornya belum ada di wa_contacts (tidak ditulis, hanya dilaporkan)
SELECT DISTINCT b.phone AS phone_tanpa_wa_contact FROM bf b WHERE NOT EXISTS (SELECT 1 FROM wa_contacts c WHERE c.phone_normalized = b.phone);

WITH ins AS (
  INSERT INTO wa_messages (id, wa_contact_id, wa_message_id, direction, body, message_type, raw_payload, sent_at)
  SELECT gen_random_uuid(), c.id, b.mid, b.dir, b.body, b.mtype,
         jsonb_build_object('source', 'wa-web-backfill', 'approxTime', b.approx), b.sent_at
  FROM bf b
  JOIN LATERAL (SELECT id FROM wa_contacts WHERE phone_normalized = b.phone ORDER BY id LIMIT 1) c ON true
  ON CONFLICT (wa_message_id) DO NOTHING
  RETURNING wa_contact_id, wa_message_id, direction, sent_at
), act AS (
  INSERT INTO lead_activities (id, lead_id, type, payload, created_at)
  SELECT gen_random_uuid(), wc.lead_id,
         CASE ins.direction WHEN 'inbound' THEN 'wa_message_received' ELSE 'wa_message_sent' END,
         jsonb_build_object('waContactId', ins.wa_contact_id, 'waMessageId', ins.wa_message_id, 'source', 'wa-web-backfill'),
         ins.sent_at
  FROM ins JOIN wa_contacts wc ON wc.id = ins.wa_contact_id
  WHERE wc.lead_id IS NOT NULL
  RETURNING 1
)
SELECT (SELECT count(*) FROM ins) AS pesan_baru_masuk,
       (SELECT count(*) FROM bf) - (SELECT count(*) FROM ins) AS sudah_ada_dilewati,
       (SELECT count(*) FROM act) AS lead_activities_baru;

\if :{?apply}
  COMMIT;
  \echo 'COMMIT: tersimpan'
\else
  ROLLBACK;
  \echo 'DRY RUN: di-ROLLBACK (tambahkan -v apply=1 untuk menyimpan)'
\endif
