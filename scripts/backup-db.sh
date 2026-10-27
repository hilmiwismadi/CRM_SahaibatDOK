#!/usr/bin/env bash
# Scheduled pg_dump of the CRM database (runs on the VPS from cron — see
# Context/11.DbBackup.md). Pulled to a local machine by scripts/pull-vps-backups.ps1.
#
# Layout under $BACKUP_ROOT (default ~/Mapping/backups/auto):
#   db_YYYYmmdd_HHMMSS.custom   every run; newest KEEP_ALL kept
#   daily/                      copy of the first run of each day; newest KEEP_DAILY kept
#   weekly/                     copy of the first run of each Sunday; newest KEEP_WEEKLY kept
#
# A dump is written to *.tmp, verified with pg_restore -l, then renamed, so a
# half-written or corrupt file never carries a *.custom name (the puller only
# fetches *.custom).
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-$HOME/Mapping/backups/auto}"
DB_CONTAINER="${DB_CONTAINER:-mapping-db-1}"
KEEP_ALL="${KEEP_ALL:-28}"      # 4 runs/day * 7 days
KEEP_DAILY="${KEEP_DAILY:-60}"
KEEP_WEEKLY="${KEEP_WEEKLY:-26}"

mkdir -p "$BACKUP_ROOT/daily" "$BACKUP_ROOT/weekly"
LOG="$BACKUP_ROOT/backup.log"
log() { echo "$(date '+%F %T') $*" >> "$LOG"; }

# One run at a time; a slow dump must not overlap the next cron tick.
exec 9>"$BACKUP_ROOT/.lock"
flock -n 9 || { log "SKIP another backup is still running"; exit 0; }

stamp="$(date +%Y%m%d_%H%M%S)"
out="$BACKUP_ROOT/db_${stamp}.custom"
tmp="$out.tmp"
trap 'rm -f "$tmp"' EXIT

if ! docker exec "$DB_CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$tmp"; then
  log "FAIL pg_dump exited non-zero"
  exit 1
fi

# Catalog read-back proves the archive is complete, not just non-empty.
if ! docker exec -i "$DB_CONTAINER" pg_restore -l < "$tmp" > /dev/null 2>&1; then
  log "FAIL verification (pg_restore -l) for db_${stamp}"
  exit 1
fi

mv "$tmp" "$out"
size="$(du -h "$out" | cut -f1)"
log "OK db_${stamp}.custom ($size)"

# First run of the day / of Sunday becomes a longer-lived copy.
today="$(date +%Y%m%d)"
if ! ls "$BACKUP_ROOT/daily"/db_${today}_*.custom > /dev/null 2>&1; then
  cp "$out" "$BACKUP_ROOT/daily/"
  if [ "$(date +%u)" = "7" ]; then cp "$out" "$BACKUP_ROOT/weekly/"; fi
fi

prune() { # dir keep
  # `|| true`: an empty dir (no glob match) makes ls fail, which pipefail would turn into a failed run.
  { ls -1t "$1"/db_*.custom 2> /dev/null || true; } | tail -n +"$(($2 + 1))" | xargs -r rm -f --
}
prune "$BACKUP_ROOT" "$KEEP_ALL"
prune "$BACKUP_ROOT/daily" "$KEEP_DAILY"
prune "$BACKUP_ROOT/weekly" "$KEEP_WEEKLY"
