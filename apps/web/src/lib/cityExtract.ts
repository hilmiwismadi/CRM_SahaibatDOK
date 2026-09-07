/**
 * Heuristic city/regency extraction from a free-text Google-Maps-style
 * Indonesian address. There's no dedicated `city` column on `Lead` — this
 * scans for known city/regency names as a substring match, good enough to
 * back a "Location" filter dropdown on the dashboard without a schema
 * change. Extend this list as new regions show up in scraped data.
 */
const KNOWN_CITIES = [
  "Yogyakarta",
  "Sleman",
  "Bantul",
  "Kulon Progo",
  "Gunungkidul",
  "Semarang",
  "Surakarta",
  "Solo",
  "Salatiga",
  "Magelang",
  "Kudus",
  "Jakarta Barat",
  "Jakarta Timur",
  "Jakarta Pusat",
  "Jakarta Selatan",
  "Jakarta Utara",
  "Bekasi",
  "Depok",
  "Tangerang",
  "Bogor",
  "Bandung",
  "Surabaya",
  "Malang",
  "Sidoarjo",
];

export function extractCity(address: string | null | undefined): string | null {
  if (!address) return null;
  for (const city of KNOWN_CITIES) {
    if (address.toLowerCase().includes(city.toLowerCase())) {
      return city;
    }
  }
  return null;
}
