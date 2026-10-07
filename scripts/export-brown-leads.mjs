// Langkah 1 SOP (lihat Context/6.BrownPinLeads.md): ekspor semua lead yang
// pin-nya COKLAT di /map ke scrape-output/brown-leads.json + tabel di md.
// READ-ONLY: hanya GET /api/leads, tidak menulis ke CRM, tidak kirim apapun.
//
// Aturan coklat diambil persis dari apps/web/src/app/map/MapView.tsx pinColor():
//   noWaAccount === true  ||  !phoneNormalized
//
// Pakai: node scripts/export-brown-leads.mjs [BASE_URL]
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "http://103.93.162.31:3000";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const res = await fetch(`${BASE}/api/leads`);
if (!res.ok) throw new Error(`GET /api/leads -> ${res.status}`);
const { leads } = await res.json();

const isDummy = (l) => /^testing\s*$/i.test(l.name);
const brown = leads.filter((l) => (l.noWaAccount || !l.phoneNormalized) && !isDummy(l));

// Link Maps: pakai googleMapsUrl kalau ada; kalau tidak, place_id (ChIJ...) yang
// reliable; lead manual (tanpa place id) fallback ke pencarian nama + alamat.
function mapsUrl(l) {
  if (l.googleMapsUrl) return l.googleMapsUrl;
  if (/^ChIJ/.test(l.googlePlaceId ?? ""))
    return `https://www.google.com/maps/place/?q=place_id:${l.googlePlaceId}`;
  const q = encodeURIComponent([l.name, l.address].filter(Boolean).join(" "));
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
const linkKind = (l) =>
  l.googleMapsUrl ? "crm-url" : /^ChIJ/.test(l.googlePlaceId ?? "") ? "place-id" : "name-search";

function city(a) {
  const m = a?.match(/\b(Kota|Kabupaten)\s+[A-Z][\w ]+?(?=,|$)|\b[A-Z][\w ]+? (Regency|City)\b/);
  return m ? m[0].trim() : "-";
}

const rows = brown
  .map((l) => ({
    id: l.id,
    name: l.name.trim(),
    jenis: l.noWaAccount ? "no_wa_account" : "no_phone",
    city: city(l.address),
    address: l.address,
    rating: l.rating,
    reviewCount: l.reviewCount,
    phoneRaw: l.phoneRaw,
    phoneOffice: l.phoneOffice,
    website: l.website,
    instagramUrl: l.instagramUrl,
    mapsUrl: mapsUrl(l),
    mapsLinkKind: linkKind(l),
  }))
  .sort((a, b) => (a.jenis === b.jenis ? (b.reviewCount ?? 0) - (a.reviewCount ?? 0) : a.jenis === "no_wa_account" ? -1 : 1));

mkdirSync(join(root, "scrape-output"), { recursive: true });
writeFileSync(join(root, "scrape-output", "brown-leads.json"), JSON.stringify(rows, null, 2));

// Hasil script gmaps-check (kalau sudah pernah dijalankan) -> kolom paling kanan.
// Kosong = tidak ketemu / belum dicek. Tag: H=link WA, M=nomor HP di Maps/website, L=lemah.
const checkPath = join(root, "scrape-output", "gmaps-check-results.json");
const checked = new Map((existsSync(checkPath) ? JSON.parse(readFileSync(checkPath, "utf8")) : []).map((r) => [r.id, r]));
const local = (e) => "0" + e.slice(2);
// Nomor yang sudah pernah dicoba di riset lama (38 kandidat, dok. 5) ditandai †.
const prior = new Set(readFileSync(join(root, "Context", "5.WaTestMessageSend.md"), "utf8").match(/62[0-9]{9,12}/g) ?? []);
const leadById = new Map(rows.map((r) => [r.id, r]));
// Saring supaya kolom tidak berisik: buang confidence low, buang nomor yang sama
// dengan nomor CRM lead itu sendiri (sudah diketahui gagal WA), dan buang medium
// dari direktori (>3 link tel: di satu website = daftar cabang/toko, bukan kontak lead).
function foundCell(id) {
  const r = checked.get(id);
  if (!r?.candidates) return "";
  const own = String(leadById.get(id)?.phoneRaw ?? "").replace(/\D/g, "").replace(/^0/, "62");
  const telCount = r.candidates.filter((c) => c.source === "website:tel-link").length;
  return r.candidates
    .filter((c) => c.confidence !== "low" && c.number !== own && !(c.source === "website:tel-link" && telCount > 3))
    .map((c) => `${local(c.number)} (${c.confidence === "high" ? "H" : "M"})${prior.has(c.number) ? "†" : ""}`)
    .join(", ");
}

const n = (f) => rows.filter(f).length;
const esc = (s) => String(s ?? "-").replace(/\|/g, "\\|");
const today = new Date().toISOString().slice(0, 10);
const table = rows
  .map(
    (r, i) =>
      `| ${i + 1} | ${r.id.slice(0, 8)} | ${esc(r.name)} | ${r.jenis === "no_wa_account" ? "NoWA" : "NoPhone"} | ${esc(r.city)} | ${r.rating ?? "-"} (${r.reviewCount ?? 0}) | ${esc(r.phoneRaw ?? r.phoneOffice)} | ${r.website ? "ada" : "-"} | [maps](${r.mapsUrl}) | ${foundCell(r.id)} |`,
  )
  .join("\n");

const md = `# 6. Daftar Lead Pin Coklat di /map

Snapshot ${today}, di-generate otomatis oleh \`scripts/export-brown-leads.mjs\` dari \`GET ${BASE}/api/leads\` (read-only). Data lengkap (ID penuh, alamat, semua URL): \`scrape-output/brown-leads.json\`. Jangan edit tabel ini manual, jalankan ulang script-nya.

**Definisi coklat** (persis dari \`MapView.tsx\` \`pinColor()\`): \`noWaAccount = true\` **ATAU** \`phoneNormalized\` kosong. Jadi coklat mencakup dua kelompok, bukan cuma "Tidak Ada Kontak WA" di [[4.NoWaAccountLeads]].

| Kelompok | Jumlah | Arti |
|---|---|---|
| NoWA | ${n((r) => r.jenis === "no_wa_account")} | Ada nomor, tapi terkonfirmasi bukan akun WA (mayoritas landline). Sudah dibahas di [[4.NoWaAccountLeads]]. |
| NoPhone | ${n((r) => r.jenis === "no_phone")} | Tidak ada nomor sama sekali di CRM. |
| **Total** | **${rows.length}** | Lead dummy "Testing" dikeluarkan. |

Kelengkapan data yang sudah ada di CRM (berguna untuk memilih jalur cek di SOP): website terisi ${n((r) => r.website)}, instagram terisi ${n((r) => r.instagramUrl)}, telp kantor terisi ${n((r) => r.phoneOffice)}. Sumber link Maps: place-id ${n((r) => r.mapsLinkKind === "place-id")}, URL asli dari CRM ${n((r) => r.mapsLinkKind === "crm-url")}, pencarian nama (lead manual tanpa place id, kurang presisi) ${n((r) => r.mapsLinkKind === "name-search")}.

## Daftar

Urut: NoWA dulu, lalu NoPhone; di dalam kelompok urut jumlah review terbanyak. Kolom ID = 8 karakter pertama UUID lead.

Kolom **Nomor WA ditemukan** diisi otomatis dari \`scrape-output/gmaps-check-results.json\` ([[7.GmapsOverviewCheckSOP]]). Kosong = tidak ketemu atau belum dicek. Tag: **H** = link WA eksplisit, **M** = nomor HP di Maps/website. Nomor lemah (L), nomor CRM lama yang sudah gagal WA, dan daftar cabang/toko tidak ditampilkan (masih ada di JSON). **†** = nomor ini juga ada di 38 kandidat riset lama ([[5.WaTestMessageSend]]). Semua masih kandidat, belum diverifikasi manusia.

| # | ID | Nama | Jenis | Kota | Rating (review) | Telp di CRM | Website CRM | Maps | Nomor WA ditemukan |
|---|---|---|---|---|---|---|---|---|---|
${table}

## Terkait
- [[4.NoWaAccountLeads]], [[5.WaTestMessageSend]] — riwayat deep search & insiden kirim pesan test.
- [[7.GmapsOverviewCheckSOP]] — SOP cek overview Google Maps untuk mencari nomor WA dari daftar ini.
`;
writeFileSync(join(root, "Context", "6.BrownPinLeads.md"), md);
console.log(`brown=${rows.length} noWA=${n((r) => r.jenis === "no_wa_account")} noPhone=${n((r) => r.jenis === "no_phone")} -> Context/6.BrownPinLeads.md`);
