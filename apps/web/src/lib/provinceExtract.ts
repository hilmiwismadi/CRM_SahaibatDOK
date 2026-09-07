/**
 * Heuristic province extraction from a free-text Google-Maps-style
 * Indonesian address (same approach as src/lib/cityExtract.ts, one level
 * up the administrative hierarchy). Google sometimes returns the English
 * name of a province depending on locale, so each canonical Indonesian
 * name lists its common English/abbreviated variants too. More specific
 * (compound) names are listed before the generic province they'd
 * otherwise be mistaken for as a substring (e.g. "Kepulauan Riau" before
 * "Riau", "Papua Barat" before bare "Papua").
 */
const PROVINCES: { canonical: string; patterns: string[] }[] = [
  { canonical: "Daerah Istimewa Yogyakarta", patterns: ["Daerah Istimewa Yogyakarta", "Special Region of Yogyakarta", "D.I. Yogyakarta", "DI Yogyakarta"] },
  { canonical: "DKI Jakarta", patterns: ["DKI Jakarta", "Daerah Khusus Ibukota Jakarta", "Special Capital Region of Jakarta", "Jakarta"] },
  { canonical: "Jawa Barat", patterns: ["Jawa Barat", "West Java"] },
  { canonical: "Jawa Tengah", patterns: ["Jawa Tengah", "Central Java"] },
  { canonical: "Jawa Timur", patterns: ["Jawa Timur", "East Java"] },
  { canonical: "Banten", patterns: ["Banten"] },
  { canonical: "Bali", patterns: ["Bali"] },
  { canonical: "Nusa Tenggara Barat", patterns: ["Nusa Tenggara Barat", "West Nusa Tenggara"] },
  { canonical: "Nusa Tenggara Timur", patterns: ["Nusa Tenggara Timur", "East Nusa Tenggara"] },
  { canonical: "Aceh", patterns: ["Aceh"] },
  { canonical: "Sumatera Utara", patterns: ["Sumatera Utara", "Sumatra Utara", "North Sumatra"] },
  { canonical: "Sumatera Barat", patterns: ["Sumatera Barat", "Sumatra Barat", "West Sumatra"] },
  { canonical: "Sumatera Selatan", patterns: ["Sumatera Selatan", "Sumatra Selatan", "South Sumatra"] },
  { canonical: "Kepulauan Riau", patterns: ["Kepulauan Riau", "Riau Islands"] },
  { canonical: "Riau", patterns: ["Riau"] },
  { canonical: "Jambi", patterns: ["Jambi"] },
  { canonical: "Kepulauan Bangka Belitung", patterns: ["Bangka Belitung", "Bangka-Belitung"] },
  { canonical: "Bengkulu", patterns: ["Bengkulu"] },
  { canonical: "Lampung", patterns: ["Lampung"] },
  { canonical: "Kalimantan Barat", patterns: ["Kalimantan Barat", "West Kalimantan"] },
  { canonical: "Kalimantan Tengah", patterns: ["Kalimantan Tengah", "Central Kalimantan"] },
  { canonical: "Kalimantan Selatan", patterns: ["Kalimantan Selatan", "South Kalimantan"] },
  { canonical: "Kalimantan Utara", patterns: ["Kalimantan Utara", "North Kalimantan"] },
  { canonical: "Kalimantan Timur", patterns: ["Kalimantan Timur", "East Kalimantan"] },
  { canonical: "Sulawesi Utara", patterns: ["Sulawesi Utara", "North Sulawesi"] },
  { canonical: "Sulawesi Tengah", patterns: ["Sulawesi Tengah", "Central Sulawesi"] },
  { canonical: "Sulawesi Tenggara", patterns: ["Sulawesi Tenggara", "Southeast Sulawesi"] },
  { canonical: "Sulawesi Selatan", patterns: ["Sulawesi Selatan", "South Sulawesi"] },
  { canonical: "Sulawesi Barat", patterns: ["Sulawesi Barat", "West Sulawesi"] },
  { canonical: "Gorontalo", patterns: ["Gorontalo"] },
  { canonical: "Maluku Utara", patterns: ["Maluku Utara", "North Maluku"] },
  { canonical: "Maluku", patterns: ["Maluku"] },
  { canonical: "Papua Barat Daya", patterns: ["Papua Barat Daya", "Southwest Papua"] },
  { canonical: "Papua Barat", patterns: ["Papua Barat", "West Papua"] },
  { canonical: "Papua Tengah", patterns: ["Papua Tengah", "Central Papua"] },
  { canonical: "Papua Pegunungan", patterns: ["Papua Pegunungan", "Highland Papua"] },
  { canonical: "Papua Selatan", patterns: ["Papua Selatan", "South Papua"] },
  { canonical: "Papua", patterns: ["Papua"] },
];

export function extractProvince(address: string | null | undefined): string | null {
  if (!address) return null;
  const lower = address.toLowerCase();
  for (const { canonical, patterns } of PROVINCES) {
    if (patterns.some((p) => lower.includes(p.toLowerCase()))) {
      return canonical;
    }
  }
  return null;
}
