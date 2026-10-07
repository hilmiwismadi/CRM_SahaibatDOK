// Turns a JSON export of "leads missing from CRM tim" (see the SQL below)
// into the CSV format sales.sahaibat.com/lead-engine's "Import candidates
// (CSV)" box expects. Fills in `city`/`province` by parsing the scraped
// `address` string (Indonesian addresses reliably contain "Kec. X" and
// "Kabupaten Y"/"Kota Y" before the postal code) — this is the manual step
// that used to be done by hand for every batch (see Context/
// 2.LeadPipelineScripts.md's SOP). Best-effort: always skim the output CSV
// before importing, an address that doesn't match the usual pattern falls
// back to blank city/province rather than a guess.
//
// Usage:
//   1. Get the JSON input — run this on the VPS (or over SSH) against
//      mapping-db-1, for whatever "notFound" subset crm-team-sync.js just
//      reported (only THOSE names, not the whole incremental batch — no
//      need to create a CRM-tim candidate for a lead that's already there):
//
//        SELECT json_agg(row_to_json(t)) FROM (
//          SELECT name, category, coalesce(province,'') AS province,
//                 coalesce(address,'') AS address,
//                 replace(coalesce(phone_normalized,''),'+62','0') AS phone_mobile,
//                 regexp_replace(coalesce(phone_office,''),'[^0-9]','','g') AS phone_office
//          FROM leads WHERE name = ANY(ARRAY['Name One','Name Two', ...])
//        ) t;
//
//      Save the single-line JSON array output to e.g. staging/2026-09-29.json
//      (the `staging/` folder is gitignored scratch space — only the final
//      CSVs in `imports/` are meant to be kept).
//
//   2. node build-import-csv.mjs staging/2026-09-29.json imports/2026-09-29.csv
//
//   3. Skim imports/2026-09-29.csv — check city/province landed right,
//      fix by hand if a row looks off — then paste into /lead-engine.

import { readFileSync, writeFileSync } from "node:fs";

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error("Usage: node build-import-csv.mjs <input.json> <output.csv>");
  process.exit(1);
}

const CSV_HEADER = [
  "name", "specialty", "org", "city", "province", "phone", "email",
  "pic_name", "doctor_count", "bpjs_provider", "rme_status",
  "linkedin_url", "instagram_url", "facebook_url", "tiktok_url", "website", "source",
];

// Address strings look like:
//   "Jl. Troso Baru, Dusun 1, Troso, Kec. Karanganom, Kabupaten Klaten, Jawa Tengah 57475"
// City = the Kabupaten/Kota segment; province = the segment right before
// the trailing postal code, when not already given by the `province` column.
function deriveCity(address) {
  const m = address.match(/Kabupaten\s+([A-Za-zÀ-ÿ' .-]+?)(?:,|\s*\d|$)/) ||
    address.match(/Kota\s+([A-Za-zÀ-ÿ' .-]+?)(?:,|\s*\d|$)/);
  return m ? m[1].trim() : "";
}

function deriveProvince(address) {
  const KNOWN_PROVINCES = [
    "Daerah Istimewa Yogyakarta", "Jawa Tengah", "Jawa Timur", "Jawa Barat",
    "DKI Jakarta", "Banten", "Special Region of Yogyakarta", "Central Java", "East Java",
  ];
  for (const p of KNOWN_PROVINCES) {
    if (address.includes(p)) return p === "Special Region of Yogyakarta" ? "Daerah Istimewa Yogyakarta"
      : p === "Central Java" ? "Jawa Tengah"
      : p === "East Java" ? "Jawa Timur"
      : p;
  }
  return "";
}

function csvField(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const rows = JSON.parse(readFileSync(inputPath, "utf-8"));
const today = new Date().toISOString().slice(0, 10);
const source = `SahAIbat DOK - Mapping sync ${today}`;

const lines = [CSV_HEADER.join(",")];
let unresolvedCity = 0;
for (const r of rows) {
  const address = r.address || "";
  const city = deriveCity(address);
  const province = r.province || deriveProvince(address);
  if (!city) unresolvedCity++;
  const phone = r.phone_mobile || r.phone_office || "";
  const row = {
    name: r.name, specialty: r.category || "", org: "", city, province, phone,
    email: "", pic_name: "", doctor_count: "", bpjs_provider: "", rme_status: "",
    linkedin_url: "", instagram_url: "", facebook_url: "", tiktok_url: "", website: "",
    source,
  };
  lines.push(CSV_HEADER.map((k) => csvField(row[k])).join(","));
}

writeFileSync(outputPath, lines.join("\n") + "\n");
console.log(`Wrote ${rows.length} rows to ${outputPath}`);
if (unresolvedCity > 0) {
  console.log(`${unresolvedCity} row(s) have no city (address didn't match "Kabupaten X"/"Kota X") — check these by hand before importing.`);
}
