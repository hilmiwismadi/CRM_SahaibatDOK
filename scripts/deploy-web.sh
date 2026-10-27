#!/usr/bin/env bash
# One-command deploy of apps/web files to the VPS: upload, rebuild `web`,
# wait for the container, verify checksums. Run by the user with `!` (Claude's
# auto mode is not allowed to deploy to production — Context/10.VpsAccessAndDeploy.md).
#
# Usage: bash /d/Hilmi/Coding/Sahaibat/Mapping/scripts/deploy-web.sh <path relative to Mapping> [...]
#   e.g. ... deploy-web.sh apps/web/src/app/map/MapView.tsx
# Only the files named are uploaded (the local tree may hold other, undeployed work).
set -u
ROOT=/d/Hilmi/Coding/Sahaibat/Mapping
KEY=/d/Hilmi/Coding/Sahaibat/VPS_DW/DWSSH.pem
HOST=DzakiWismadi@103.93.162.31
ssh_vps() { ssh -n -i "$KEY" -o BatchMode=yes "$HOST" "$@"; }

[ $# -gt 0 ] || { echo "Usage: deploy-web.sh <file relative to Mapping> ..."; exit 1; }
cd "$ROOT" || exit 1
for f in "$@"; do
  [ -f "$f" ] || { echo "File lokal tidak ada: $f"; exit 1; }
done

# Two builds at once broke the container name once (2026-10-26).
# "[d]ocker": otherwise pgrep -f matches the remote shell running this very check.
if ssh_vps "pgrep -f '[d]ocker compose (build|up)' >/dev/null"; then
  echo "Build lain sedang berjalan di VPS. Tunggu selesai, lalu jalankan ulang."
  exit 1
fi

echo "== Upload $# file"
for f in "$@"; do
  ssh_vps "mkdir -p 'Mapping/$(dirname "$f")'" || { echo "GAGAL mkdir untuk $f"; exit 1; }
  scp -q -i "$KEY" "$f" "$HOST:Mapping/$f" || { echo "GAGAL upload $f"; exit 1; }
  local_md5=$(md5sum "$f" | cut -d' ' -f1)
  remote_md5=$(ssh_vps "md5sum 'Mapping/$f'" | cut -d' ' -f1)
  if [ "$local_md5" != "$remote_md5" ]; then echo "GAGAL checksum $f"; exit 1; fi
  echo "   ok  $f"
done

echo "== Build web di VPS (±2 menit, CRM mati sebentar saat recreate)"
ssh_vps "cd ~/Mapping && : > /tmp/web-build.log && nohup sh -c 'docker compose build web && docker compose up -d --no-deps web' > /tmp/web-build.log 2>&1 < /dev/null &"

for i in $(seq 1 90); do
  sleep 5
  log=$(ssh_vps "tail -n 40 /tmp/web-build.log")
  if echo "$log" | grep -q "mapping-web-1 Started"; then
    echo "== SELESAI: $(ssh_vps "docker ps --filter name=mapping-web-1 --format '{{.Status}}'")"
    exit 0
  fi
  if echo "$log" | grep -qE "ERROR|failed to solve|Error response|exit code: [1-9]"; then
    echo "== BUILD GAGAL. Log terakhir:"
    echo "$log" | tail -n 30
    exit 1
  fi
  [ $((i % 6)) -eq 0 ] && echo "   ... masih build ($((i * 5)) detik)"
done
echo "== Belum selesai setelah 7,5 menit. Cek: ssh ... 'tail -n 30 /tmp/web-build.log'"
exit 1
