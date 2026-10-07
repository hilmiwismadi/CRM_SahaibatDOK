/**
 * CSV builder for the "Import candidates (CSV)" box on sales.sahaibat.com's
 * /lead-engine — ports the exact logic that used to live in
 * scripts/crm-sync/build-import-csv.mjs (run manually against a psql JSON
 * export) into something GET /api/sync/leadinput can call directly against
 * this app's own Postgres, no SSH/staging-file round trip needed. Column
 * order and header must match /lead-engine's parser exactly — see
 * Context/CRMSync/0.CRMSahaibatUnderstanding.md's "Import candidates (CSV)"
 * section for what that page expects.
 */

export const CSV_HEADER = [
  "name",
  "specialty",
  "org",
  "city",
  "province",
  "phone",
  "email",
  "pic_name",
  "doctor_count",
  "bpjs_provider",
  "rme_status",
  "linkedin_url",
  "instagram_url",
  "facebook_url",
  "tiktok_url",
  "website",
  "source",
] as const;

export interface CsvSourceRow {
  name: string;
  category: string | null;
  province: string | null;
  address: string | null;
  phoneMobile: string;
}

// Indonesian addresses reliably contain "Kec. X" then "Kabupaten Y"/"Kota Y"
// before the postal code — same heuristic as the old script. Doesn't catch
// the occasional English-format address ("X Regency", "Central Java") —
// those still need a manual fix in the preview table, same as before.
function deriveCity(address: string): string {
  const m =
    address.match(/Kabupaten\s+([A-Za-zÀ-ÿ' .-]+?)(?:,|\s*\d|$)/) ||
    address.match(/Kota\s+([A-Za-zÀ-ÿ' .-]+?)(?:,|\s*\d|$)/);
  return m ? m[1].trim() : "";
}

const KNOWN_PROVINCES = [
  "Daerah Istimewa Yogyakarta",
  "Jawa Tengah",
  "Jawa Timur",
  "Jawa Barat",
  "DKI Jakarta",
  "Banten",
  "Special Region of Yogyakarta",
  "Central Java",
  "East Java",
];

function deriveProvince(address: string): string {
  for (const p of KNOWN_PROVINCES) {
    if (address.includes(p)) {
      if (p === "Special Region of Yogyakarta") return "Daerah Istimewa Yogyakarta";
      if (p === "Central Java") return "Jawa Tengah";
      if (p === "East Java") return "Jawa Timur";
      return p;
    }
  }
  return "";
}

function csvField(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export interface CsvRow {
  name: string;
  specialty: string;
  city: string;
  province: string;
  phone: string;
  cityUnresolved: boolean;
}

export function buildCsvRows(sourceRows: CsvSourceRow[], sourceLabel: string): { rows: CsvRow[]; csv: string } {
  const rows: CsvRow[] = sourceRows.map((r) => {
    const address = r.address || "";
    const city = deriveCity(address);
    const province = r.province || deriveProvince(address);
    return { name: r.name, specialty: r.category || "", city, province, phone: r.phoneMobile, cityUnresolved: !city };
  });

  const lines = [CSV_HEADER.join(",")];
  for (const row of rows) {
    const full = {
      name: row.name,
      specialty: row.specialty,
      org: "",
      city: row.city,
      province: row.province,
      phone: row.phone,
      email: "",
      pic_name: "",
      doctor_count: "",
      bpjs_provider: "",
      rme_status: "",
      linkedin_url: "",
      instagram_url: "",
      facebook_url: "",
      tiktok_url: "",
      website: "",
      source: sourceLabel,
    };
    lines.push(CSV_HEADER.map((k) => csvField(full[k])).join(","));
  }

  return { rows, csv: lines.join("\n") };
}
