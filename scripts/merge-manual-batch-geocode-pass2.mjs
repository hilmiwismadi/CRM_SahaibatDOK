// Second, more conservative merge pass for leads still missing lat/lng
// after the exact-title pass. Only applies a match when stripping generic
// words ("klinik", "pratama") yields a UNIQUE candidate among all scraped
// titles — if multiple different scraped businesses collapse to the same
// stripped key (e.g. several distinct "Bina Sehat" clinics in different
// cities), it is left unmatched rather than guessed. Never logs review content.

import { readFileSync, writeFileSync } from "node:fs";

const API = "http://localhost:3000/api/leads";
const SCRAPE_FILE = new URL("../scrape-output/manual-batch-20260906.json", import.meta.url);
const RESULTS_FILE = new URL("./manual-batch-results.json", import.meta.url);
const SUMMARY_FILE = new URL("./manual-batch-geocode-summary.json", import.meta.url);

const GENERIC_WORDS = new Set(["klinik", "pratama", "praktik", "praktek", "mandiri", "umum", "dokter", "dr"]);

function stripGeneric(s) {
  return norm(s)
    .split(" ")
    .filter((w) => w && !GENERIC_WORDS.has(w))
    .join(" ");
}
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

  // Group by stripped key; only keep keys with exactly one DISTINCT title.
  const byStrippedKey = new Map();
  for (const s of scraped) {
    const key = stripGeneric(s.title);
    if (!byStrippedKey.has(key)) byStrippedKey.set(key, []);
    const bucket = byStrippedKey.get(key);
    if (!bucket.some((b) => norm(b.title) === norm(s.title))) bucket.push(s);
  }

  const inserted = JSON.parse(readFileSync(RESULTS_FILE, "utf-8"));
  const summary = JSON.parse(readFileSync(SUMMARY_FILE, "utf-8"));
  const stillMissedNames = new Set(summary.missed.map((m) => m.replace(" (PUT failed)", "")));

  const mergedNow = [];
  const stillMissed = [];

  for (const lead of inserted) {
    if (!lead.leadId || !stillMissedNames.has(lead.name)) continue;
    const key = stripGeneric(lead.name);
    const candidates = byStrippedKey.get(key);
    if (!candidates || candidates.length !== 1) {
      stillMissed.push(lead.name);
      continue;
    }
    const match = candidates[0];
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
    if (res.ok) mergedNow.push(lead.name);
    else stillMissed.push(`${lead.name} (PUT failed)`);
  }

  console.log(`Pass 2 merged: ${mergedNow.length}`);
  console.log(`Still missed (genuinely ambiguous or no match): ${stillMissed.length}`);
  writeFileSync(
    SUMMARY_FILE,
    JSON.stringify({ mergedCount: summary.mergedCount + mergedNow.length, mergedPass2: mergedNow, missed: stillMissed }, null, 2),
  );
}

main();
