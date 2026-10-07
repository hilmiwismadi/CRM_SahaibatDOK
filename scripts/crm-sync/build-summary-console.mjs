// Usage: node build-summary-console.mjs <YYYY-MM-DD>  -> summaries/<date>.console.js
// Paste hasilnya di DevTools Console halaman /sync/dailylog. Hanya mengubah tampilan di tab itu
// (tidak menulis ke DB); hilang saat refresh. Untuk permanen pakai build-summary-sql.mjs.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const date = process.argv[2];
const dir = join(dirname(fileURLToPath(import.meta.url)), "summaries");
const { rows } = JSON.parse(readFileSync(join(dir, `${date}.json`), "utf8"));
const map = Object.fromEntries(rows.map((r) => [r.leadId, r.summary]));
const js = `(() => {
  const DATE = ${JSON.stringify(date)};
  const S = ${JSON.stringify(map)};
  if (!window.__origFetch) window.__origFetch = window.fetch;
  window.fetch = async (...a) => {
    const res = await window.__origFetch(...a);
    const u = typeof a[0] === "string" ? a[0] : a[0]?.url || "";
    if (!u.includes("/api/sync/dailylog") || !u.includes("date=" + DATE)) return res;
    const j = await res.clone().json();
    j.rows.forEach((r) => { if (!r.claudeSummary && S[r.leadId]) r.claudeSummary = S[r.leadId]; });
    return new Response(JSON.stringify(j), { status: res.status, headers: { "content-type": "application/json" } });
  };
  // paksa muat ulang data: pindah tanggal lalu kembali
  const inp = document.querySelector('input[type="date"]');
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  const fire = (v) => { set.call(inp, v); inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true })); };
  const other = DATE.slice(0, 8) + (DATE.endsWith("01") ? "02" : "01");
  fire(other);
  setTimeout(() => { fire(DATE); console.log("Ringkasan " + DATE + " disuntik ke tampilan (" + Object.keys(S).length + " lead)."); }, 800);
})();
`;
writeFileSync(join(dir, `${date}.console.js`), js);
console.log(js);
