#!/usr/bin/env node
// Drops scraped listings that fall outside the target area, using lat/lng
// distance from per-region centers (addresses often omit the kabupaten, so
// text matching misses too much). Dedupes by place_id too — gosom returns the
// same listing for several overlapping queries.
//
// Usage: node scripts/clean-scrape-region.mjs <name> [<name> ...]
//   reads  scrape-output/<name>.json  (raw gosom NDJSON)
//   keeps  scrape-output/<name>.raw.json (untouched copy, written once)
//   writes scrape-output/<name>.json (cleaned; this is the file to import)
// <name> is "<region>-dokter-klinik"; region must be a key below.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// [lat, lng, radiusKm] — extra entries cover exclaves (Bawean).
export const REGIONS = {
  semarang: [[-7.0, 110.42, 35]],
  pati: [[-6.75, 111.04, 35]],
  sragen: [[-7.43, 111.02, 30]],
  blora: [[-6.97, 111.42, 40]],
  tuban: [[-6.9, 112.05, 35]],
  gresik: [[-7.16, 112.65, 30], [-5.85, 112.65, 25]],
  mojokerto: [[-7.47, 112.43, 30]],
  jombang: [[-7.55, 112.23, 30]],
  kediri: [[-7.82, 112.01, 35]],
  tulungagung: [[-8.07, 111.9, 35]],
  blitar: [[-8.1, 112.17, 35]],
  malang: [[-7.98, 112.63, 45]],
  probolinggo: [[-7.75, 113.22, 40]],
  pasuruan: [[-7.65, 112.9, 35]],
  jember: [[-8.17, 113.7, 50]],
};

function km(lat1, lng1, lat2, lng2) {
  const r = (d) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scrape-output");
for (const name of process.argv.slice(2)) {
  const region = name.split("-")[0];
  const centers = REGIONS[region];
  if (!centers) { console.error(`${name}: unknown region "${region}"`); continue; }
  const file = path.join(dir, `${name}.json`);
  const raw = path.join(dir, `${name}.raw.json`);
  if (!existsSync(raw)) copyFileSync(file, raw);
  const rows = readFileSync(raw, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const seen = new Set();
  let dup = 0, far = 0, noCoord = 0;
  const kept = [];
  for (const x of rows) {
    if (seen.has(x.place_id)) { dup++; continue; }
    seen.add(x.place_id);
    if (x.latitude == null || x.longitude == null) { noCoord++; continue; }
    if (!centers.some(([la, ln, rad]) => km(la, ln, x.latitude, x.longitude) <= rad)) { far++; continue; }
    kept.push(x);
  }
  writeFileSync(file, kept.map((x) => JSON.stringify(x)).join("\n") + "\n");
  console.log(`${name}: raw ${rows.length} -> kept ${kept.length} (duplikat ${dup}, luar wilayah ${far}, tanpa koordinat ${noCoord})`);
}
