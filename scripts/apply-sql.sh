#!/usr/bin/env bash
# Apply one or more local .sql files to the VPS database (e.g. the
# sync_daily_summaries inserts in scripts/crm-sync/summaries/). Run by the user with `!`.
#
# Usage: bash /d/Hilmi/Coding/Sahaibat/Mapping/scripts/apply-sql.sh <file.sql> [...]
#   e.g. ... apply-sql.sh scripts/crm-sync/summaries/2026-10-23.sql scripts/crm-sync/summaries/2026-10-26.sql
set -u
ROOT=/d/Hilmi/Coding/Sahaibat/Mapping
KEY=/d/Hilmi/Coding/Sahaibat/VPS_DW/DWSSH.pem
HOST=DzakiWismadi@103.93.162.31

[ $# -gt 0 ] || { echo "Usage: apply-sql.sh <file.sql> ..."; exit 1; }
cd "$ROOT" || exit 1
for f in "$@"; do
  [ -f "$f" ] || { echo "File tidak ada: $f"; exit 1; }
done

cat "$@" | ssh -i "$KEY" -o BatchMode=yes "$HOST" "docker exec -i mapping-db-1 sh -c 'psql -U \$POSTGRES_USER -d \$POSTGRES_DB'"
