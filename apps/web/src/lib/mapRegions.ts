/**
 * Region picker for /map. There's no region column on `Lead`, so a region is
 * a set of address substrings (matched case-insensitively with Prisma
 * `contains`). Google Maps returns addresses in a mix of Indonesian and
 * English ("Kabupaten Pati" / "Pati Regency", "Kota Semarang" / "Semarang
 * City"), so a region lists every spelling it needs.
 *
 * Keep terms specific: a bare "Pati" also matches "Kec. Gn. Pati" (a Semarang
 * district), so Pati lists "Kabupaten Pati" / "Pati Regency" instead.
 *
 * Add a line here when a new area is scraped — it appears in /map's picker
 * automatically once at least one lead matches.
 */
export interface MapRegion {
  key: string;
  label: string;
  terms: string[];
}

export const ALL_REGIONS_KEY = "all";

export const MAP_REGIONS: MapRegion[] = [
  // DI Yogyakarta
  { key: "yogyakarta", label: "Yogyakarta", terms: ["Yogyakarta"] },
  { key: "sleman", label: "Sleman", terms: ["Sleman"] },
  { key: "bantul", label: "Bantul", terms: ["Bantul"] },
  { key: "kulon-progo", label: "Kulon Progo", terms: ["Kulon Progo"] },
  { key: "gunungkidul", label: "Gunungkidul", terms: ["Gunungkidul", "Gunung Kidul"] },
  // Jawa Tengah
  { key: "semarang", label: "Semarang", terms: ["Semarang"] },
  { key: "surakarta", label: "Surakarta (Solo)", terms: ["Surakarta", "Kota Solo", "Solo City"] },
  { key: "klaten", label: "Klaten", terms: ["Klaten"] },
  { key: "karanganyar", label: "Karanganyar", terms: ["Karanganyar"] },
  { key: "sukoharjo", label: "Sukoharjo", terms: ["Sukoharjo"] },
  { key: "boyolali", label: "Boyolali", terms: ["Boyolali"] },
  { key: "wonogiri", label: "Wonogiri", terms: ["Wonogiri"] },
  { key: "sragen", label: "Sragen", terms: ["Sragen"] },
  { key: "blora", label: "Blora", terms: ["Blora"] },
  { key: "pati", label: "Pati", terms: ["Kabupaten Pati", "Kab. Pati", "Pati Regency"] },
  // Jawa Timur
  { key: "surabaya", label: "Surabaya", terms: ["Surabaya"] },
  { key: "malang", label: "Malang", terms: ["Malang"] },
  { key: "gresik", label: "Gresik", terms: ["Gresik"] },
  { key: "jombang", label: "Jombang", terms: ["Jombang"] },
  { key: "mojokerto", label: "Mojokerto", terms: ["Mojokerto"] },
  { key: "kediri", label: "Kediri", terms: ["Kediri"] },
  { key: "blitar", label: "Blitar", terms: ["Blitar"] },
  { key: "tulungagung", label: "Tulungagung", terms: ["Tulungagung"] },
  { key: "pasuruan", label: "Pasuruan", terms: ["Pasuruan"] },
  { key: "probolinggo", label: "Probolinggo", terms: ["Probolinggo"] },
  { key: "jember", label: "Jember", terms: ["Jember"] },
  { key: "tuban", label: "Tuban", terms: ["Tuban"] },
  // Jawa Barat
  { key: "bandung", label: "Bandung", terms: ["Bandung"] },
];

/** Address substrings for the given region keys; unknown keys are ignored. */
export function termsForRegions(keys: string[]): string[] {
  const wanted = new Set(keys);
  return MAP_REGIONS.filter((r) => wanted.has(r.key)).flatMap((r) => r.terms);
}
