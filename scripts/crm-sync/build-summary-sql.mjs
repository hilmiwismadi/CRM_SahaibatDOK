// Usage: node scripts/crm-sync/build-summary-sql.mjs <YYYY-MM-DD>
// Reads  scripts/crm-sync/summaries/<date>.json  ({date, rows:[{leadId,name,summary}]})
// Writes scripts/crm-sync/summaries/<date>.sql   (INSERT ... ON CONFLICT DO NOTHING)
// Apply on the VPS: see Context/9.DailySummaryInput.md
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
  console.error("Usage: node build-summary-sql.mjs YYYY-MM-DD");
  process.exit(1);
}

const dir = join(dirname(fileURLToPath(import.meta.url)), "summaries");
const { rows, date: fileDate } = JSON.parse(readFileSync(join(dir, `${date}.json`), "utf8"));
if (fileDate !== date) throw new Error(`date in JSON (${fileDate}) != ${date}`);

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const seen = new Set();
const values = rows.map((r, i) => {
  if (!uuid.test(r.leadId)) throw new Error(`row ${i}: bad leadId`);
  if (seen.has(r.leadId)) throw new Error(`row ${i}: duplicate leadId ${r.leadId}`);
  seen.add(r.leadId);
  const s = String(r.summary ?? "").trim();
  if (!s) throw new Error(`row ${i} (${r.name}): empty summary`);
  if (s.includes("$q$")) throw new Error(`row ${i}: summary contains $q$`);
  return `  ('${r.leadId}', '${date}', $q$${s}$q$)`;
});

const sql =
  `-- sync_daily_summaries ${date} (${rows.length} rows)\nBEGIN;\n` +
  `INSERT INTO sync_daily_summaries (lead_id, date, summary) VALUES\n${values.join(",\n")}\n` +
  `ON CONFLICT (lead_id, date) DO NOTHING;\nCOMMIT;\n` +
  `SELECT count(*) AS rows_for_date FROM sync_daily_summaries WHERE date='${date}';\n`;

const out = join(dir, `${date}.sql`);
writeFileSync(out, sql);
console.log(`Wrote ${out} (${rows.length} rows)`);
