// Merges scrape-output/manual-batch-20260906.json (gosom NDJSON) back onto
// the manual leads created by import-manual-batch.mjs, matched by name.
// Does NOT touch google_place_id (leaves the "manual-<uuid>" id in place —
// PUT /api/leads/[id] doesn't support changing it, by design) — only
// backfills lat/lng/address/category/googleMapsUrl for rows still missing
// coordinates. Never logs/prints scraped review content.

import { readFileSync, writeFileSync } from "node:fs";

const API = "http://localhost:3000/api/leads";
const SCRAPE_FILE = new URL("../scrape-output/manual-batch-20260906.json", import.meta.url);
const RESULTS_FILE = new URL("./manual-batch-results.json", import.meta.url);

function norm(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function main() {
  const scraped = readFileSync(SCRAPE_FILE, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .map((r) => ({
      title: r.title,
      lat: r.latitude,
      lng: r.longitude,
      address: r.address || null,
      category: r.category || null,
      googleMapsUrl: r.link || null,
    }))
    .filter((r) => typeof r.lat === "number" && typeof r.lng === "number");

  // Index by normalized title for exact match; keep first occurrence per title.
  const byTitle = new Map();
  for (const s of scraped) {
    const key = norm(s.title);
    if (!byTitle.has(key)) byTitle.set(key, s);
  }

  const inserted = JSON.parse(readFileSync(RESULTS_FILE, "utf-8"));
  const merged = [];
  const missed = [];

  for (const lead of inserted) {
    if (!lead.leadId) continue;
    const key = norm(lead.name);
    const match = byTitle.get(key);
    if (!match) {
      missed.push(lead.name);
      continue;
    }
    const res = await fetch(`${API}/${lead.leadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: match.lat,
        lng: match.lng,
        address: match.address,
        category: match.category,
        googleMapsUrl: match.googleMapsUrl,
      }),
    });
    if (res.ok) {
      merged.push(lead.name);
    } else {
      missed.push(`${lead.name} (PUT failed)`);
    }
  }

  console.log(`Merged geocoding onto ${merged.length} leads.`);
  console.log(`Missed (no scrape match): ${missed.length}`);
  writeFileSync(
    new URL("./manual-batch-geocode-summary.json", import.meta.url),
    JSON.stringify({ mergedCount: merged.length, missed }, null, 2),
  );
}

main();
