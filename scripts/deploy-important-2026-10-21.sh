#!/usr/bin/env bash
# Deploy /reports/important (tabel + log pengingat) — 2026-10-21.
# Urutan: backup DB -> migrasi followup_note_logs -> upload kode -> build web (latar belakang server) -> isi data 7 lead Utama.
# Jalankan dari mana saja: bash /d/Hilmi/Coding/Sahaibat/Mapping/scripts/deploy-important-2026-10-21.sh
set -euo pipefail
cd /d/Hilmi/Coding/Sahaibat/Mapping
K=../VPS_DW/DWSSH.pem
H=DzakiWismadi@103.93.162.31
MIG=apps/web/prisma/migrations/20261021120000_followup_note_logs

echo "== 1. Backup DB"
ssh -i $K $H 'cd ~/Mapping && mkdir -p backups/pre-notelog-20261021 && docker exec mapping-db-1 pg_dump -U sahaibat sahaibat_mapping | gzip > backups/pre-notelog-20261021/db.sql.gz && ls -la backups/pre-notelog-20261021/db.sql.gz'

echo "== 2. Migrasi followup_note_logs"
scp -q -i $K $MIG/migration.sql $H:/tmp/notelog-migration.sql
ssh -i $K $H "docker exec -i mapping-db-1 psql -U sahaibat -d sahaibat_mapping -v ON_ERROR_STOP=1 < /tmp/notelog-migration.sql"

echo "== 3. Upload kode"
ssh -i $K $H "mkdir -p Mapping/$MIG"
for f in apps/web/prisma/schema.prisma $MIG/migration.sql \
         apps/web/src/app/reports/important/page.tsx apps/web/src/app/reports/followupParts.tsx \
         "apps/web/src/app/api/reports/followup/[leadId]/route.ts" apps/web/src/app/api/reports/important/route.ts; do
  scp -q -i $K "$f" "$H:Mapping/$f" && echo "  ok $f"
done

echo "== 4. Isi data 7 lead Utama"
scp -q -i $K scripts/crm-sync/summaries/important-2026-10-21.sql $H:/tmp/
ssh -i $K $H "docker exec -i mapping-db-1 psql -U sahaibat -d sahaibat_mapping -v ON_ERROR_STOP=1 < /tmp/important-2026-10-21.sql"

echo "== 5. Build web (latar belakang server)"
ssh -i $K $H "cd ~/Mapping && nohup sh -c 'docker compose build web && docker compose up -d --no-deps web' > /tmp/web-build.log 2>&1 &"
echo "Build berjalan. Pantau: ssh -i $K $H 'tail -n 6 /tmp/web-build.log' sampai 'Container mapping-web-1 Started'."
