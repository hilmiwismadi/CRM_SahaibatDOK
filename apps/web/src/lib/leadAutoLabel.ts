/**
 * Import-time classification of scraped listings, used by
 * upsertLeadsFromStaging.ts. Two independent decisions:
 *
 * - `isPuskesmas` — skipped entirely (not ICP for this batch of scraping;
 *   Google Maps keeps returning them for "klinik <area>" queries even when
 *   the query itself never says "puskesmas").
 * - `autoLabelFor` — dental/aesthetic clinics are still imported but tagged
 *   with the same `leads.label` value /map's "Later" group uses, so they
 *   show up purple instead of competing with untouched leads.
 *
 * Deliberately conservative on "aesthetic": a plain "klinik kulit" or
 * dermatologist is a legitimate medical practice, so only explicitly
 * cosmetic words match.
 */

const PUSKESMAS_RE = /\bpuskesmas\b|pusat kesehatan masyarakat|community health cent(?:er|re)/i;

const DENTAL_RE = /\bdental\b|\bdentist\b|dokter gigi|klinik gigi|\bdrg\.?\s|\bdrg\b|\bgigi\b|\bortodonti|orthodont/i;

const AESTHETIC_RE =
  /est?etik|aesthetic|esthetic|kecantikan|\bbeauty\b|skin\s?care|skin clinic|perawatan kulit|\bglow\b|cosmetic|kosmetik|\bspa\b|slimming|\bbotox\b|\bfiller\b/i;

// Categories gosom returns for "klinik <area>" queries that are plainly not a
// medical practice (seen in the Blora smoke test: banks, ATMs, pharmacies,
// beauty shops). Pharmacies are excluded too — a lead here must be a
// practice/clinic a rep can pitch to. Matched against the Google category only,
// never the name, so "Klinik Pratama Bank ..." style names are unaffected.
const NON_CLINIC_CATEGORY_RE =
  /^(?:bank|atm|apotek|toko|salon|agen|layanan transportasi|dokter hewan|hotel|restoran|minimarket|supermarket|sekolah|kantor)|apotek|pharmacy|veterinar|insurance|asuransi|atm|bank|toko kesehatan/i;

export function isNonClinic(category: string | null | undefined): boolean {
  return NON_CLINIC_CATEGORY_RE.test(category ?? "");
}

export function isPuskesmas(name: string | null | undefined, category: string | null | undefined): boolean {
  return PUSKESMAS_RE.test(name ?? "") || PUSKESMAS_RE.test(category ?? "");
}

/** Returns a `leads.label` value ("dental" | "aesthetic") or null if the listing looks like a regular practice. */
export function autoLabelFor(
  name: string | null | undefined,
  category: string | null | undefined,
): "dental" | "aesthetic" | null {
  const text = `${name ?? ""} ${category ?? ""}`;
  if (DENTAL_RE.test(text)) return "dental";
  if (AESTHETIC_RE.test(text)) return "aesthetic";
  return null;
}
