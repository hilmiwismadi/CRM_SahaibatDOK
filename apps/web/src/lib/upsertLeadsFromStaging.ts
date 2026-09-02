import { Prisma } from "@prisma/client";
import { normalizePhoneNumber } from "@sahaibat/shared";
import { db } from "./db";

export interface UpsertSummary {
  scannedCount: number;
  skippedCount: number; // missing google_place_id or lat/lng — can't dedupe/place on map
  newCount: number;
  updatedCount: number;
}

/**
 * Merges unprocessed rows from `stg_scrape_results` into the canonical
 * `leads` table, keyed on `google_place_id`.
 *
 * Critical invariant: the `ON CONFLICT ... DO UPDATE SET` clause below only
 * ever touches scrape-sourced columns. CRM-owned columns (pipeline_stage,
 * notes, assigned_to, is_lost, lost_reason, custom_tags, trial*) are never
 * part of the UPDATE — re-scraping an area must never clobber work already
 * done on a lead. See docs/ARCHITECTURE.md "Scraper → leads pipeline".
 *
 * `geom` can't be set through the Prisma Client API (Unsupported type), so
 * the whole upsert runs as raw SQL to keep it atomic with the rest of the
 * row instead of a separate follow-up query per lead.
 */
export async function upsertLeadsFromStaging(scrapeJobId: string): Promise<UpsertSummary> {
  const rows = await db.stgScrapeResult.findMany({
    where: { scrapeJobId, importedAt: null },
  });

  const summary: UpsertSummary = { scannedCount: rows.length, skippedCount: 0, newCount: 0, updatedCount: 0 };

  for (const row of rows) {
    if (!row.googlePlaceId || row.lat == null || row.lng == null) {
      summary.skippedCount += 1;
      continue;
    }

    const phoneNormalized = normalizePhoneNumber(row.phone);

    const result = await db.$queryRaw<{ inserted: boolean }[]>(Prisma.sql`
      INSERT INTO "leads" (
        "id", "google_place_id", "name", "category", "address",
        "phone_raw", "phone_normalized", "website", "email",
        "rating", "review_count", "price_range", "open_hours", "google_maps_url",
        "geom", "lat", "lng",
        "first_scraped_at", "last_scraped_at",
        "pipeline_stage", "created_at", "updated_at"
      ) VALUES (
        gen_random_uuid(), ${row.googlePlaceId}, ${row.name ?? "Unknown"}, ${row.category}, ${row.address},
        ${row.phone}, ${phoneNormalized}, ${row.website}, ${row.email},
        ${row.rating}, ${row.reviewCount}, ${row.priceRange}, ${row.openHours ?? Prisma.JsonNull}::jsonb, NULL,
        ST_SetSRID(ST_MakePoint(${row.lng}, ${row.lat}), 4326), ${row.lat}, ${row.lng},
        now(), now(),
        'new', now(), now()
      )
      ON CONFLICT ("google_place_id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "category" = EXCLUDED."category",
        "address" = EXCLUDED."address",
        "phone_raw" = EXCLUDED."phone_raw",
        "phone_normalized" = EXCLUDED."phone_normalized",
        "website" = EXCLUDED."website",
        "email" = EXCLUDED."email",
        "rating" = EXCLUDED."rating",
        "review_count" = EXCLUDED."review_count",
        "price_range" = EXCLUDED."price_range",
        "open_hours" = EXCLUDED."open_hours",
        "geom" = EXCLUDED."geom",
        "lat" = EXCLUDED."lat",
        "lng" = EXCLUDED."lng",
        "last_scraped_at" = now(),
        "updated_at" = now()
      RETURNING (xmax = 0) AS inserted
    `);

    if (result[0]?.inserted) {
      summary.newCount += 1;
    } else {
      summary.updatedCount += 1;
    }

    await db.stgScrapeResult.update({
      where: { id: row.id },
      data: { importedAt: new Date() },
    });
  }

  return summary;
}
