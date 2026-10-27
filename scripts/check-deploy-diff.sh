#!/usr/bin/env bash
# Read-only: bandingkan hash file kode lokal vs VPS (abaikan CRLF) + cek tabel/data kunci.
# Tidak mengubah apa pun di VPS. Jalankan dari Git Bash:
#   bash /d/Hilmi/Coding/Sahaibat/Mapping/scripts/check-deploy-diff.sh
# Hasil: Mapping/scripts/deploy-diff-report.txt
set -u
export LC_ALL=C
ROOT=/d/Hilmi/Coding/Sahaibat
KEY=$ROOT/VPS_DW/DWSSH.pem
IP=$(grep -oE '[0-9]{1,3}(\.[0-9]{1,3}){3}' "$ROOT/Mapping/Context/10.VpsAccessAndDeploy.md" | head -1)
HOST="DzakiWismadi@$IP"
OUT=$ROOT/Mapping/scripts/deploy-diff-report.txt
PATHS="apps/web/src apps/web/prisma apps/wa-bridge/src packages/shared/src"
HASH='find '"$PATHS"' -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.sql" -o -name "*.prisma" -o -name "*.css" \) | sort | while read f; do printf "%s  %s\n" "$(tr -d "\r" < "$f" | md5sum | cut -c1-32)" "$f"; done'

TMP=$(mktemp -d)
cd "$ROOT/Mapping" && eval "$HASH" > "$TMP/local.txt"
ssh -i "$KEY" -o BatchMode=yes -o ConnectTimeout=15 "$HOST" "cd ~/Mapping && $HASH" > "$TMP/remote.txt" || { echo "SSH gagal"; exit 1; }

SQL="select 'migrasi terakhir', string_agg(migration_name, ', ' order by migration_name) from (select migration_name from _prisma_migrations order by migration_name desc limit 3) m
union all select 'wa_messages 13 Okt 14:25 - 14 Okt WIB (backfill?)', count(*)::text from wa_messages where sent_at between '2026-10-13 07:25' and '2026-10-14 17:00'
union all select 'wa_messages terbaru (UTC)', max(sent_at)::text from wa_messages
union all select 'scheduled_messages per status', string_agg(status || '=' || n, ', ') from (select status, count(*) n from scheduled_messages group by 1) s
union all select 'sync_daily_summaries tanggal terakhir', max(date) from sync_daily_summaries
union all select 'followup_note_logs baris', count(*)::text from followup_note_logs;"
DB=$(ssh -i "$KEY" -o BatchMode=yes "$HOST" "docker exec -i mapping-db-1 psql -U sahaibat -d sahaibat_mapping -At -F ' | ' -c \"$SQL\"; docker ps --format '{{.Names}} {{.Status}}' | grep mapping; cd ~/Mapping && ls -la --time-style=+%F_%T apps/web/src/app/api/sync/ 2>/dev/null | tail -n +4")

{
  echo "# Deploy diff $(date '+%F %T')"
  # Perbandingan pakai awk (tidak bergantung urutan sort/locale)
  awk 'FNR==NR{r[$2]=$1;next}{l[$2]=$1}
       END{
         print "## Beda isi (lokal vs VPS)"; for(f in l) if((f in r) && r[f]!=l[f]) print "   " f
         print "## Hanya di lokal (belum di-deploy)"; for(f in l) if(!(f in r)) print "   " f
         print "## Hanya di VPS"; for(f in r) if(!(f in l)) print "   " f
         n=0; for(f in l) if((f in r) && r[f]==l[f]) n++; print "## Identik: " n " file"
       }' "$TMP/remote.txt" "$TMP/local.txt"
  echo "## DB & container"; echo "$DB" | sed 's/^/   /'
} > "$OUT"
rm -rf "$TMP"
echo "Selesai -> $OUT"
