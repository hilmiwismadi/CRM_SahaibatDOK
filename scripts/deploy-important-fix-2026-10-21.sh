#!/usr/bin/env bash
# Perbaikan tampilan /reports/important (kolom aksi terpotong, teks tahap terpotong) — 2026-10-21.
set -euo pipefail
cd /d/Hilmi/Coding/Sahaibat/Mapping
K=../VPS_DW/DWSSH.pem
H=DzakiWismadi@103.93.162.31
f=apps/web/src/app/reports/important/page.tsx

scp -q -i $K "$f" "$H:Mapping/$f" && echo "ok $f"
# -n: jangan tunggu proses build di server, supaya perintah ini langsung selesai.
ssh -n -i $K $H "cd ~/Mapping && nohup sh -c 'docker compose build web && docker compose up -d --no-deps web' > /tmp/web-build.log 2>&1 < /dev/null &"
echo "Build berjalan (±2-5 menit)."
