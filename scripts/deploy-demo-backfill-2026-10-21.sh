#!/usr/bin/env bash
# Lengkapi 10 demo yang belum tercatat + tab Penting ikut menghitung kunjungan tatap muka — 2026-10-21.
set -euo pipefail
cd /d/Hilmi/Coding/Sahaibat/Mapping
K=../VPS_DW/DWSSH.pem
H=DzakiWismadi@103.93.162.31

echo "== 1. Isi 10 demo yang belum tercatat"
scp -q -i $K scripts/crm-sync/summaries/demo-backfill-2026-10-21.sql $H:/tmp/
ssh -i $K $H "docker exec -i mapping-db-1 psql -U sahaibat -d sahaibat_mapping -v ON_ERROR_STOP=1 < /tmp/demo-backfill-2026-10-21.sql"

echo "== 2. Upload kode"
for f in apps/web/src/app/reports/important/page.tsx apps/web/src/app/api/reports/important/route.ts; do
  scp -q -i $K "$f" "$H:Mapping/$f" && echo "  ok $f"
done

echo "== 3. Build web (latar belakang server)"
ssh -n -i $K $H "cd ~/Mapping && nohup sh -c 'docker compose build web && docker compose up -d --no-deps web' > /tmp/web-build.log 2>&1 < /dev/null &"
echo "Build berjalan (±2-5 menit)."
