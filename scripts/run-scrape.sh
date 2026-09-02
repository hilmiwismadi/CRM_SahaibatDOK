#!/usr/bin/env bash
# Runs gosom/google-maps-scraper for one or more queries and writes JSON
# results to scrape-output/<name>.json. Import into the leads table
# afterwards via the admin UI ("Scrapes" page) or POST /api/admin/import-staging.
#
# Usage:
#   ./scripts/run-scrape.sh -q ./scrape-queries/yogyakarta.txt -n yogyakarta-2026-09-02
#
# See docs/SCRAPER_GUIDE.md for flag reference and the block-risk tradeoff
# behind the conservative -c/-depth defaults below.
set -euo pipefail

CONCURRENCY=2
DEPTH=3
LANG=id
GEO=""
RADIUS=15000
ZOOM=13

while getopts "q:n:c:d:l:g:r:z:" opt; do
  case $opt in
    q) QUERIES_FILE="$OPTARG" ;;
    n) NAME="$OPTARG" ;;
    c) CONCURRENCY="$OPTARG" ;;
    d) DEPTH="$OPTARG" ;;
    l) LANG="$OPTARG" ;;
    g) GEO="$OPTARG" ;;
    r) RADIUS="$OPTARG" ;;
    z) ZOOM="$OPTARG" ;;
    *) echo "Unknown option"; exit 1 ;;
  esac
done

if [ -z "${QUERIES_FILE:-}" ] || [ -z "${NAME:-}" ]; then
  echo "Usage: $0 -q <queries-file> -n <name> [-c concurrency] [-d depth] [-l lang] [-g lat,lng] [-r radius] [-z zoom]"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="$REPO_ROOT/scrape-output"
mkdir -p "$OUTPUT_DIR"

QUERIES_FULL_PATH="$(cd "$(dirname "$QUERIES_FILE")" && pwd)/$(basename "$QUERIES_FILE")"

ARGS=(
  run --rm
  -v gmaps-playwright-cache:/opt
  -v "$QUERIES_FULL_PATH:/queries.txt:ro"
  -v "$OUTPUT_DIR:/out"
  gosom/google-maps-scraper
  -input /queries.txt
  -results "/out/$NAME.json"
  -json
  -depth "$DEPTH"
  -c "$CONCURRENCY"
  -lang "$LANG"
  -exit-on-inactivity 3m
)

if [ -n "$GEO" ]; then
  ARGS+=(-geo "$GEO" -radius "$RADIUS" -zoom "$ZOOM")
fi

echo "Running: docker ${ARGS[*]}"
docker "${ARGS[@]}"

echo ""
echo "Done. Results written to: $OUTPUT_DIR/$NAME.json"
echo "Import into leads via the admin Scrapes page, or:"
echo "  npx tsx scripts/import-scrape-json.ts --file \"$OUTPUT_DIR/$NAME.json\" --query \"$(cat "$QUERIES_FILE")\""
