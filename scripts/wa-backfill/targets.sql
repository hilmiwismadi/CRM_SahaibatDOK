-- Daftar chat yang perlu di-backfill: semua kontak WA yang punya pesan tercatat
-- sejak :since (WIB, 00:00). Ganti '2026-10-13' sesuai kebutuhan.
-- Jalankan (read-only):
--   ssh -i VPS_DW/DWSSH.pem DzakiWismadi@103.93.162.31 "docker exec -i mapping-db-1 psql -U sahaibat sahaibat_mapping -At" < targets.sql
select coalesce(json_agg(t order by t."lastRecordedAt" desc), '[]'::json) from (
  select wc.phone_normalized as phone,
         coalesce(l.name, wc.display_name, wc.phone_normalized) as name,
         l.id as "leadId",
         to_char(max(wm.sent_at), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "lastRecordedAt",
         count(*) filter (where wm.direction='outbound') as "outCount",
         count(*) filter (where wm.direction='inbound') as "inCount"
  from wa_messages wm
  join wa_contacts wc on wc.id = wm.wa_contact_id
  left join leads l on l.id = wc.lead_id
  where wm.sent_at >= ('2026-10-13 00:00'::timestamp - interval '7 hours')   -- 00:00 WIB dalam UTC
    and wc.phone_normalized is not null
  group by wc.phone_normalized, l.id, l.name, wc.display_name
) t;
