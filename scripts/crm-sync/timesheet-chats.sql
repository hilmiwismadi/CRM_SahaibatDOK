-- READ-ONLY. Chat harian lead yang MEMBALAS tapi BELUM punya "Ringkasan Claude"
-- (sync_daily_summaries). Dipakai tiap minggu untuk /sync/timesheet — lihat
-- Context/12.TimesheetSync.md. Ganti dua tanggal di bawah (WIB) sesuai minggu.
-- Catatan: wa_messages.sent_at = timestamp TANPA zona yang menyimpan UTC, maka
-- konversinya dobel AT TIME ZONE (UTC dulu, baru Asia/Jakarta).
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
where x.wib::date between '2026-10-19' and '2026-10-25'   -- <-- ganti rentang minggu
  and exists (                       -- lead ini membalas (inbound tidak kosong) di hari yang sama
    select 1 from msgs i
    where i.wa_contact_id = x.wa_contact_id
      and i.direction = 'inbound'
      and coalesce(trim(i.body), '') <> ''
      and i.wib::date = x.wib::date)
  and not exists (                   -- dan belum ada ringkasannya
    select 1 from sync_daily_summaries s
    where s.lead_id = x.lead_id
      and s.date = to_char(x.wib, 'YYYY-MM-DD'))
order by d, x.name, x.wib;
