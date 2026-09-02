import { Prisma } from "@prisma/client";

/**
 * Shape of one line of gosom/google-maps-scraper's NDJSON output (-json
 * flag). Verified against real output — see docs/SCRAPER_GUIDE.md — rather
 * than trusted blindly from the upstream source, since field names have
 * drifted from what's in the Go source comments before (e.g. the struct
 * field `Longtitude` actually serializes as `longitude`, not `longtitude`).
 * Only the fields we map into `stg_scrape_results` are declared; the rest
 * of gosom's ~36 fields ride along in `rawJson` untouched.
 */
export interface GosomEntry {
  place_id: string;
  title: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  web_site: string | null;
  emails: string[] | null;
  latitude: number;
  longitude: number;
  review_rating: number | null;
  review_count: number | null;
  price_range: string | null;
  open_hours: Record<string, string[]> | null;
  link: string | null;
  [key: string]: unknown;
}

/** Parses gosom's NDJSON output file content into typed entries, skipping blank lines. */
export function parseGosomNdjson(fileContent: string): GosomEntry[] {
  return fileContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as GosomEntry);
}

/** Maps one parsed entry to a `stg_scrape_results` row, ready for `prisma.stgScrapeResult.createMany`. */
export function mapGosomEntryToStagingRow(entry: GosomEntry, scrapeJobId: string) {
  return {
    scrapeJobId,
    googlePlaceId: entry.place_id || null,
    name: entry.title || null,
    category: entry.category || null,
    address: entry.address || null,
    phone: entry.phone || null,
    website: entry.web_site || null,
    email: entry.emails?.[0] ?? null,
    lat: entry.latitude ?? null,
    lng: entry.longitude ?? null,
    rating: entry.review_rating ?? null,
    reviewCount: entry.review_count ?? null,
    priceRange: entry.price_range || null,
    openHours: (entry.open_hours ?? undefined) as Prisma.InputJsonValue | undefined,
    rawJson: entry as unknown as Prisma.InputJsonValue,
  };
}
