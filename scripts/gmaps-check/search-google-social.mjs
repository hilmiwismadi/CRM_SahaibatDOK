// Langkah 3 SOP (lihat Context/7.GmapsOverviewCheckSOP.md): Google "<nama> <kota>",
// baca hasil teratas (Instagram/Facebook/linktree/website) dan ambil nomor HP dari snippet.
//
// HANYA MEMBACA. Tidak kirim WA, tidak menyentuh wa-bridge/CRM. Hasil = kandidat untuk crosscheck manual.
//
// Pakai (dari folder ini):
//   node search-google-social.mjs --names "Klinik Gading"     # uji satu/beberapa lead (pisah dengan |)
//   node search-google-social.mjs --missing --limit 10        # lead yang belum punya kandidat dari langkah 2
//   node search-google-social.mjs --missing --only no_wa_account
// Jendela Chrome terlihat (Google lebih sering blokir headless). Profil disimpan di .chrome-profile/
// supaya cookies bertahan. Kalau muncul captcha, selesaikan sendiri di jendela itu; script menunggu.
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const LEADS = join(root, "scrape-output", "brown-leads.json");
const GCHECK = join(root, "scrape-output", "gmaps-check-results.json");
const OUT = join(root, "scrape-output", "google-search-results.json");
const REPORT = join(root, "Context", "9.GoogleSearchResults.md");

const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const limit = Number(arg("limit") ?? Infinity);
const only = arg("only");
const names = arg("names")?.split("|").map((s) => s.trim().toLowerCase());
const missing = argv.includes("--missing");
const TOP = 5;
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (a, b) => a + Math.random() * (b - a);

function toE164(raw) {
  let d = String(raw).replace(/[^0-9]/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return d;
}
const isMobile = (e) => /^628[0-9]{8,11}$/.test(e);
const NUM_RE = /(?:\+?62|0)[\s.-]?8[0-9]{1,3}[\s.-]?[0-9]{3,4}[\s.-]?[0-9]{3,5}/g;
const SOCIAL = /instagram\.com|facebook\.com|fb\.com|linktr\.ee|lynk\.id|bio\.link|beacons\.ai|tiktok\.com/;

// nama bersih untuk query: buang embel-embel operasional, kurung, tanda baca
function cleanName(n) {
  return n.replace(/\([^)]*\)/g, " ").replace(/\b24\s*jam\b/gi, " ").replace(/@\w+/g, " ").replace(/\s+/g, " ").trim();
}
const cleanCity = (c) => (c && c !== "-" ? c.replace(/^(Kota|Kabupaten)\s+/i, "").replace(/\s+(Regency|City)$/i, "") : "");

async function solveIfBlocked(page) {
  for (let i = 0; i < 60; i++) { // tunggu maksimal ±5 menit sampai manusia selesaikan captcha
    const blocked = page.url().includes("/sorry/") || (await page.locator("text=/unusual traffic|lalu lintas yang tidak biasa/i").count()) > 0;
    if (!blocked) return true;
    if (i === 0) console.log("  ! Captcha/blokir Google. Selesaikan di jendela Chrome, script menunggu...");
    await sleep(5000);
  }
  return false;
}

async function consentIfAny(page) {
  const btn = page.locator('button:has-text("Terima semua"), button:has-text("Accept all"), button:has-text("Tolak semua"), button:has-text("Reject all")').first();
  if (await btn.count()) await btn.click().catch(() => {});
}

async function searchLead(page, lead) {
  const query = [cleanName(lead.name), cleanCity(lead.city)].filter(Boolean).join(" ");
  const res = { id: lead.id, name: lead.name, jenis: lead.jenis, query, checkedAt: new Date().toISOString() };
  try {
    await page.goto(`https://www.google.com/search?hl=id&gl=id&q=${encodeURIComponent(query)}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await consentIfAny(page);
    if (!(await solveIfBlocked(page))) { res.status = "blocked"; return res; }
    await page.waitForSelector("#search, #rso", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const raw = await page.evaluate((TOP) => {
      const out = [];
      for (const a of document.querySelectorAll("#search a:has(h3), #rso a:has(h3)")) {
        if (out.some((o) => o.url === a.href)) continue;
        let box = a; for (let i = 0; i < 5 && box.parentElement; i++) { box = box.parentElement; if ((box.innerText ?? "").length > 120) break; }
        out.push({ url: a.href, title: a.querySelector("h3")?.innerText ?? "", text: box.innerText ?? "" });
        if (out.length >= TOP) break;
      }
      // kotak "featured/knowledge panel" di atas hasil, kalau ada
      const panel = document.querySelector("#rhs, [data-attrid='kc:/local:alt phone']")?.innerText ?? "";
      return { out, panel };
    }, TOP);

    const ownLandline = String(lead.phoneRaw ?? "").replace(/[^0-9]/g, "").replace(/^0/, "");
    res.results = raw.out.map((r, i) => {
      const text = `${r.title}\n${r.text}`;
      const digits = text.replace(/[^0-9]/g, "");
      const numbers = [...new Set([...text.matchAll(NUM_RE)].map((m) => toE164(m[0])).filter(isMobile))];
      return {
        rank: i + 1, url: r.url, title: r.title, social: SOCIAL.test(r.url),
        landlineMatch: ownLandline.length >= 6 && digits.includes(ownLandline), // landline CRM ikut muncul = akun kemungkinan besar benar
        numbers, snippet: r.text.replace(/\s+/g, " ").slice(0, 300),
      };
    });
    const own = String(lead.phoneRaw ?? "").replace(/[^0-9]/g, "").replace(/^0/, "62");
    res.candidates = res.results.flatMap((r) => r.numbers.filter((n) => n !== own).map((n) => ({
      number: n, rank: r.rank, url: r.url, social: r.social, landlineMatch: r.landlineMatch,
      confidence: r.social && r.landlineMatch ? "high" : r.social ? "medium" : "low",
    })));
    res.status = res.candidates.length ? "found" : res.results.length ? "no_number_in_top" : "no_results";
  } catch (e) { res.status = "error"; res.error = String(e.message ?? e).slice(0, 200); }
  return res;
}

function writeReport(results) {
  const esc = (s) => String(s ?? "-").replace(/\|/g, "\\|");
  const found = results.filter((r) => r.status === "found");
  let md = `# 9. Hasil Pencarian Google (nama + kota) untuk Kandidat WA\n\nDi-generate \`scripts/gmaps-check/search-google-social.mjs\` pada ${new Date().toISOString().slice(0, 10)}. **Kandidat belum terverifikasi, belum ada pesan dikirim.** Lihat langkah 3 di [[7.GmapsOverviewCheckSOP]]. Data mentah (semua hasil teratas + snippet): \`scrape-output/google-search-results.json\`.\n\nConfidence: **high** = hasil Instagram/Facebook/linktree dan landline CRM ikut muncul di snippet (akun hampir pasti milik lead); **medium** = akun sosial tapi landline tidak muncul; **low** = dari situs lain (cek identitas manual).\n\nDiperiksa: ${results.length} lead, ditemukan nomor: ${found.length}.\n\n| Lead | Query | Nomor | Confidence | Sumber (peringkat) |\n|---|---|---|---|---|\n`;
  for (const r of found) {
    const rank = { high: 3, medium: 2, low: 1 };
    const c = [...r.candidates].sort((a, b) => rank[b.confidence] - rank[a.confidence]);
    md += `| ${esc(r.name)} | ${esc(r.query)} | ${c.map((x) => "0" + x.number.slice(2)).join("<br>")} | ${c.map((x) => x.confidence).join("<br>")} | ${c.map((x) => `[#${x.rank}](${x.url})`).join("<br>")} |\n`;
  }
  const rest = results.filter((r) => r.status !== "found");
  if (rest.length) md += `\n## Tidak ketemu / bermasalah (${rest.length})\n\n${rest.map((r) => `- ${r.name} (${r.status}) — \`${r.query}\``).join("\n")}\n`;
  writeFileSync(REPORT, md);
}

// --- main ---
let leads = JSON.parse(readFileSync(LEADS, "utf8"));
if (only) leads = leads.filter((l) => l.jenis === only);
if (names) leads = leads.filter((l) => names.some((n) => l.name.toLowerCase().includes(n)));
if (missing) {
  const g = new Map((existsSync(GCHECK) ? JSON.parse(readFileSync(GCHECK, "utf8")) : []).map((r) => [r.id, r]));
  // "belum ketemu" = tidak ada kandidat high/medium selain nomor CRM sendiri di hasil langkah 2
  leads = leads.filter((l) => !(g.get(l.id)?.candidates ?? []).some((c) => c.confidence !== "low" && c.number !== toE164(l.phoneRaw ?? "")));
}
const results = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
const done = new Set(results.map((r) => r.id));
const todo = leads.filter((l) => !done.has(l.id)).slice(0, limit);
console.log(`todo=${todo.length} (sudah selesai sebelumnya: ${done.size})`);

const ctx = await chromium.launchPersistentContext(join(here, ".chrome-profile"), {
  executablePath: CHROME, headless: false, locale: "id-ID", viewport: { width: 1280, height: 900 },
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
let i = 0;
for (const lead of todo) {
  const r = await searchLead(page, lead);
  results.push(r);
  writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(`[${++i}/${todo.length}] ${lead.name} -> ${r.status} ${(r.candidates ?? []).map((c) => `${c.number}(${c.confidence})`).join(" ")}`);
  if (r.status === "blocked") break; // jangan paksa kalau captcha tidak diselesaikan
  await sleep(jitter(8000, 15000)); // lebih pelan dari Maps, Google lebih sensitif
}
await ctx.close();
writeReport(results);
console.log(`selesai. laporan: ${REPORT}`);
