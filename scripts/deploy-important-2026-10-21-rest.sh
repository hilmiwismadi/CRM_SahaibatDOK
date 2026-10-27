#!/usr/bin/env bash
# Sisa deploy /reports/important 2026-10-21 (backup DB + migrasi followup_note_logs SUDAH dijalankan).
# Langkah: upload kode -> isi data 7 lead Utama -> build web (latar belakang server).
set -euo pipefail
cd /d/Hilmi/Coding/Sahaibat/Mapping
K=../VPS_DW/DWSSH.pem
H=DzakiWismadi@103.93.162.31
MIG=apps/web/prisma/migrations/20261021120000_followup_note_logs

echo "== 1. Upload kode"
ssh -i $K $H "mkdir -p Mapping/$MIG"
for f in apps/web/prisma/schema.prisma $MIG/migration.sql \
         apps/web/src/app/reports/important/page.tsx apps/web/src/app/reports/followupParts.tsx \
         "apps/web/src/app/api/reports/followup/[leadId]/route.ts" apps/web/src/app/api/reports/important/route.ts; do
  scp -q -i $K "$f" "$H:Mapping/$f" && echo "  ok $f"
done

echo "== 2. Isi data 7 lead Utama"
scp -q -i $K scripts/crm-sync/summaries/important-2026-10-21.sql $H:/tmp/
ssh -i $K $H "docker exec -i mapping-db-1 psql -U sahaibat -d sahaibat_mapping -v ON_ERROR_STOP=1 < /tmp/important-2026-10-21.sql"

echo "== 3. Build web (latar belakang server)"
ssh -i $K $H "cd ~/Mapping && nohup sh -c 'docker compose build web && docker compose up -d --no-deps web' > /tmp/web-build.log 2>&1 &"
echo "Build berjalan (±2-5 menit)."
