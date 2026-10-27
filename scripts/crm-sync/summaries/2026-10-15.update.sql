BEGIN;
INSERT INTO sync_daily_summaries (lead_id, date, summary) VALUES
('7d3945fb-050d-4bf7-a20d-49f4c1c4f23c', '2026-10-15', $q$Bu dokter tidak praktik hari ini dan sedang tugas di luar kota, jadi belum ada informasi atas surat kami; sore kami tanya ulang dengan jawaban yang sama, lalu kami akan menanyakan lagi minggu depan.$q$),
('4a7d5071-3aeb-4028-804e-d4eefe468920', '2026-10-15', $q$Sore menjawab belum bisa dulu (menolak untuk saat ini). Kami lalu menanyakan apakah rekam medis praktik sudah memakai sistem; belum dijawab.$q$),
('330c2075-0b0f-4604-87af-c032921022b3', '2026-10-15', $q$Kami menanyakan ulang ketersediaan pihak klinik. Belum ada balasan.$q$)
ON CONFLICT (lead_id, date) DO UPDATE SET summary = EXCLUDED.summary, updated_at = now();
COMMIT;
SELECT count(*) AS rows_for_date FROM sync_daily_summaries WHERE date = '2026-10-15';
