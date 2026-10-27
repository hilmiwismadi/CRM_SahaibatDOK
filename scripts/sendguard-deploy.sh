#!/bin/bash
# Deploy Send Guard: migrasi DB (additive) -> ekstrak source -> rebuild `web` (detached).
# Backup sudah ada: ~/Mapping/.deploy-backup-20261014/{db-pre-sendguard.dump,src-pre-sendguard.tgz}
set -euo pipefail
cd ~/Mapping
EXPECT=6f8a838600816a514c3decc6286cc53af9f22c53d10c36592244f8807fa9e637
NAME=20261014120000_scheduled_messages
PSQL="docker exec -i mapping-db-1 psql -U sahaibat sahaibat_mapping -v ON_ERROR_STOP=1"

rm -rf /tmp/sg-x && mkdir /tmp/sg-x && tar xzf /tmp/sendguard-files.tgz -C /tmp/sg-x
M=/tmp/sg-x/apps/web/prisma/migrations/$NAME/migration.sql
SUM=$(sha256sum "$M" | cut -d' ' -f1)
[ "$SUM" = "$EXPECT" ] || { echo "CHECKSUM TIDAK COCOK: $SUM"; exit 1; }

echo "== 1/3 migrasi"
if [ -z "$($PSQL -Atc "select to_regclass('scheduled_messages')")" ]; then
  $PSQL -1 < "$M"
else
  echo "tabel scheduled_messages sudah ada, lewati"
fi
$PSQL -c "insert into _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count)
          select gen_random_uuid()::text, '$SUM', now(), '$NAME', 1
          where not exists (select 1 from _prisma_migrations where migration_name = '$NAME')"
$PSQL -Atc "select to_regclass('scheduled_messages')"

echo "== 2/3 ekstrak source"
tar xzf /tmp/sendguard-files.tgz -C ~/Mapping
ls apps/web/src/lib/sendGuard.ts

echo "== 3/3 rebuild web (detached, 5-10 menit)"
: > /tmp/build.log
nohup sh -c 'docker compose build web > /tmp/build.log 2>&1 && docker compose up -d --no-deps web >> /tmp/build.log 2>&1; echo DONE >> /tmp/build.log' >/dev/null 2>&1 &
echo "build dimulai. Pantau: tail -1 /tmp/build.log (tunggu baris persis DONE)"
