// Langkah 2 SOP (lihat Context/7.GmapsOverviewCheckSOP.md).
// Buka listing Google Maps tiap lead pin coklat, cari kandidat kontak WA dari:
//   (a) tombol telepon di overview Maps (nomor HP 08xx dihitung kandidat)
//   (b) link wa.me / api.whatsapp.com di halaman Maps
//   (c) link website/linktree di Maps -> buka, cari link WA + nomor di teks
//       (termasuk halaman /kontak, /contact, /hubungi yang ditautkan)
//
// HANYA MEMBACA. Script ini tidak mengirim pesan WA, tidak memanggil wa-bridge,
// tidak menulis ke CRM. Hasil = kandidat untuk di-crosscheck manual oleh manusia.
//
// Pakai (dari folder ini):
//   node check-gmaps-overview.mjs --limit 5            # uji coba 5 lead
//   node check-gmaps-overview.mjs --only no_phone      # atau no_wa_account
//   node check-gmaps-overview.mjs --headless           # default: jendela terlihat
// Resume otomatis: lead yang sudah ada di hasil dilewati (hapus file hasil untuk ulang).
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const IN = join(root, "scrape-output", "brown-leads.json");
const OUT = join(root, "scrape-output", "gmaps-check-results.json");
const REPORT = join(root, "Context", "8.GmapsCheckResults.md");

const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const limit = Number(arg("limit") ?? Infinity);
const only = arg("only");
const headless = argv.includes("--headless");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (a, b) => a + Math.random() * (b - a);

// --- normalisasi nomor ---
function toE164(raw) {
  let d = String(raw).replace(/\D/g, "");
  if (d.startsWith("620")) d = "62" + d.slice(3);
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return d;
}
const isMobile = (e) => /^628\d{8,11}$/.test(e);
const NUM_RE = /(?:\+?62|0)[\s.-]?8\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{3,5}/g;

const WA_LINK_RE = /(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?[^"' ]*phone=|web\.whatsapp\.com\/send\?[^"' ]*phone=|whatsapp:\/\/send\?[^"' ]*phone=)\+?(\d{8,15})/gi;

function unwrapGoogle(href) {
  try {
    const u = new URL(href);
    if (u.hostname.includes("google.") && u.pathname === "/url") return u.searchParams.get("q") ?? href;
  } catch {}
  return href;
}

function addCand(map, number, source, url, confidence) {
  const e = toE164(number);
  if (!isMobile(e)) return;
  const rank = { high: 3, medium: 2, low: 1 };
  const cur = map.get(e);
  if (!cur || rank[confidence] > rank[cur.confidence]) map.set(e, { number: e, source, url, confidence });
}

function scanText(map, text, source, url) {
  for (const m of text.matchAll(WA_LINK_RE)) addCand(map, m[1], `${source}:wa-link`, url, "high");
  for (const m of text.matchAll(NUM_RE)) {
    const near = text.slice(Math.max(0, m.index - 60), m.index + m[0].length + 20).toLowerCase();
    addCand(map, m[0], `${source}:text`, url, /whatsapp|\bwa\b|\bw\.a\b/.test(near) ? "medium" : "low");
  }
}

async function scanWebsite(ctx, startUrl, map, visited) {
  const page = await ctx.newPage();
  const pagesSeen = [];
  try {
    const queue = [startUrl];
    while (queue.length && pagesSeen.length < 4) {
      const url = queue.shift();
      if (visited.has(url)) continue;
      visited.add(url);
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(1500);
      } catch { continue; }
      pagesSeen.push(url);
      const { html, text, hrefs } = await page.evaluate(() => ({
        html: document.documentElement.outerHTML,
        text: document.body?.innerText ?? "",
        hrefs: [...document.querySelectorAll("a[href]")].map((a) => a.href),
      }));
      scanText(map, html, "website", url);
      scanText(map, text, "website", url);
      // tel: link HP juga dihitung (medium)
      for (const h of hrefs) if (h.startsWith("tel:")) addCand(map, h.slice(4), "website:tel-link", url, "medium");
      // ikuti halaman kontak satu domain, dan linktree di halaman ini
      const host = new URL(url).hostname;
      for (const h of hrefs) {
        try {
          const u = new URL(h);
          if (/linktr\.ee|lynk\.id|bio\.link|beacons\.ai/.test(u.hostname) && u.hostname !== host) queue.push(h);
          else if (u.hostname === host && /kontak|contact|hubungi|about|tentang/i.test(u.pathname)) queue.push(h.split("#")[0]);
        } catch {}
      }
    }
  } finally { await page.close(); }
  return pagesSeen;
}

async function checkLead(ctx, lead) {
  const res = { id: lead.id, name: lead.name, jenis: lead.jenis, mapsUrl: lead.mapsUrl, checkedAt: new Date().toISOString() };
  const cands = new Map();
  const landlines = new Set();
  const page = await ctx.newPage();
  try {
    await page.goto(lead.mapsUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector('div[role="main"] h1, h1', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const info = await page.evaluate(() => {
      const main = [...document.querySelectorAll('div[role="main"]')].find((m) => m.querySelector("h1")) ?? document.body;
      return {
        title: main.querySelector("h1")?.innerText ?? null,
        items: [...main.querySelectorAll("[data-item-id]")].map((e) => ({
          id: e.getAttribute("data-item-id"), label: e.getAttribute("aria-label"), href: e.href ?? null,
        })),
        links: [...main.querySelectorAll("a[href]")].map((a) => a.href),
        text: main.innerText,
      };
    });
    res.mapsTitle = info.title;
    if (!info.title) { res.status = "maps_no_place_panel"; return res; }

    // (a) nomor di tombol telepon
    for (const it of info.items) {
      const m = it.id?.match(/^phone:tel:(.+)$/);
      if (m) {
        const e = toE164(m[1]);
        if (isMobile(e)) addCand(cands, m[1], "maps:phone-button", lead.mapsUrl, "medium");
        else landlines.add(m[1]);
      }
    }
    // (b) link WA / (c) website di overview
    const outLinks = [...new Set([...info.items.map((i) => i.href), ...info.links].filter(Boolean).map(unwrapGoogle))];
    let website = null;
    for (const l of outLinks) {
      scanText(cands, l, "maps:link", lead.mapsUrl);
      if (/instagram\.com|facebook\.com|fb\.com/.test(l)) (res.socials ??= []).push(l);
    }
    const auth = info.items.find((i) => i.id === "authority");
    if (auth?.href) website = unwrapGoogle(auth.href);
    else website = outLinks.find((l) => /^https?:/.test(l) && !/google\.|gstatic|googleusercontent|instagram|facebook|fb\.com|wa\.me|whatsapp/.test(l)) ?? null;
    scanText(cands, info.text, "maps:overview-text", lead.mapsUrl);
    res.website = website;
    res.landlines = [...landlines];

    // (c) buka website
    if (website) res.websitePagesScanned = await scanWebsite(ctx, website, cands, new Set());

    const list = [...cands.values()].sort((a, b) => ({ high: 3, medium: 2, low: 1 })[b.confidence] - ({ high: 3, medium: 2, low: 1 })[a.confidence]);
    res.candidates = list;
    res.status = list.some((c) => c.confidence === "high") ? "wa_link_found"
      : list.length ? "number_only"
      : website ? "website_no_wa" : "nothing";
  } catch (e) {
    res.status = "error"; res.error = String(e.message ?? e).slice(0, 200);
  } finally { await page.close(); }
  return res;
}

function writeReport(results) {
  const by = (s) => results.filter((r) => r.status === s);
  const groups = [["wa_link_found", "Ada link WA (confidence tinggi)"], ["number_only", "Ada nomor HP, belum ada link WA eksplisit"], ["website_no_wa", "Ada website, tidak ketemu WA"], ["nothing", "Tidak ada apa-apa"], ["maps_no_place_panel", "Halaman Maps tidak menampilkan tempat (cek link manual)"], ["error", "Error"]];
  const esc = (s) => String(s ?? "-").replace(/\|/g, "\\|");
  let md = `# 8. Hasil Cek Overview Google Maps (kandidat WA)\n\nDi-generate \`scripts/gmaps-check/check-gmaps-overview.mjs\` pada ${new Date().toISOString().slice(0, 10)}. **Semua ini KANDIDAT, belum terverifikasi.** Belum ada pesan yang dikirim. Crosscheck manual oleh BD (lihat [[7.GmapsOverviewCheckSOP]]). Data mentah: \`scrape-output/gmaps-check-results.json\`.\n\nDiperiksa: ${results.length} lead.\n\n| Status | Jumlah |\n|---|---|\n${groups.map(([k, l]) => `| ${l} | ${by(k).length} |`).join("\n")}\n`;
  for (const [k, label] of groups.slice(0, 3)) {
    if (!by(k).length) continue;
    md += `\n## ${label}\n\n| Lead | Jenis | Judul di Maps | Kandidat (confidence, sumber) | Maps |\n|---|---|---|---|---|\n`;
    for (const r of by(k)) {
      const c = (r.candidates ?? []).map((x) => `${x.number} (${x.confidence}, ${x.source}${x.url && !x.url.includes("google.com/maps") ? `: ${x.url}` : ""})`).join("<br>") || "-";
      md += `| ${esc(r.name)} | ${r.jenis === "no_wa_account" ? "NoWA" : "NoPhone"} | ${esc(r.mapsTitle)} | ${esc(c)} | [maps](${r.mapsUrl}) |\n`;
    }
  }
  const rest = results.filter((r) => ["nothing", "maps_no_place_panel", "error"].includes(r.status));
  if (rest.length) md += `\n## Tanpa kandidat / bermasalah (${rest.length})\n\n${rest.map((r) => `- ${r.name} (${r.status}${r.error ? `: ${r.error}` : ""}) [maps](${r.mapsUrl})`).join("\n")}\n`;
  writeFileSync(REPORT, md);
}

// --- main ---
let leads = JSON.parse(readFileSync(IN, "utf8"));
if (only) leads = leads.filter((l) => l.jenis === only);
const results = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
const done = new Set(results.map((r) => r.id));
const todo = leads.filter((l) => !done.has(l.id)).slice(0, limit);
console.log(`todo=${todo.length} (sudah selesai sebelumnya: ${done.size})`);

const browser = await chromium.launch({ executablePath: CHROME, headless });
const ctx = await browser.newContext({ locale: "id-ID", viewport: { width: 1280, height: 900 } });
let i = 0;
for (const lead of todo) {
  const r = await checkLead(ctx, lead);
  results.push(r);
  writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(`[${++i}/${todo.length}] ${lead.name} -> ${r.status} ${(r.candidates ?? []).map((c) => `${c.number}(${c.confidence})`).join(" ")}`);
  await sleep(jitter(4000, 8000)); // jangan agresif ke Google
}
await browser.close();
writeReport(results);
console.log(`selesai. laporan: ${REPORT}`);
