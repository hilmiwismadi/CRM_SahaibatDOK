-- READ-ONLY. Semua chat (masuk + keluar) satu hari untuk lead yang BELUM punya
-- "Ringkasan Claude" (sync_daily_summaries) pada hari itu. Dipakai untuk mengisi
-- kolom Ringkasan di /sync/dailylog — lihat Context/9.DailySyncInput.md.
-- Beda dengan timesheet-chats.sql: lead yang belum membalas tetap ikut (ringkasan
-- "belum ada balasan"). Ganti tanggal di bawah (WIB).
-- wa_messages.sent_at = timestamp TANPA zona berisi UTC -> dobel AT TIME ZONE.
with msgs as (
  select m.wa_contact_id,
         c.lead_id,
         l.name,
         m.direction,
         m.body,
         (m.sent_at at time zone 'UTC') at time zone 'Asia/Jakarta' as wib
  from wa_messages m
  join wa_contacts c on c.id = m.wa_contact_id
  join leads l on l.id = c.lead_id
)
select to_char(x.wib, 'YYYY-MM-DD') as d,
       x.lead_id,
       x.name,
       to_char(x.wib, 'HH24:MI') as t,
       x.direction,
       left(replace(replace(coalesce(x.body, ''), E'\n', ' '), '|', '/'), case when x.direction = 'outbound' then 90 else 260 end) as body
from msgs x
where x.wib::date in ('2026-10-23', '2026-10-26')   -- <-- ganti tanggal
  and not exists (
    select 1 from sync_daily_summaries s
    where s.lead_id = x.lead_id
      and s.date = to_char(x.wib, 'YYYY-MM-DD'))
order by d, x.name, x.wib;
