import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildCsvRows } from "@/lib/crmSyncCsv";
import { wibDayRange, todayWib } from "@/lib/syncDateRange";

/**
 * Automates what used to be a manual 3-step process every sync day (see
 * Context/2.LeadPipelineScripts.md's SOP): SSH into the VPS, run a
 * `wa_messages.sent_at::date = <date>` query by hand, then pipe the JSON
 * output through scripts/crm-sync/build-import-csv.mjs. This route does the
 * same query + CSV formatting directly against this app's own DB (it's the
 * same Postgres the SOP was SSH-ing into), so /sync/leadinput can just show
 * a copy-pasteable CSV for any date without leaving the browser.
 *
 * One correctness improvement over the old manual flow: the old SOP matched
 * candidate leads by NAME (a `WHERE name = ANY(...)` re-query), which broke
 * whenever two leads happened to share a name (e.g. "Klinik Griya Sehat",
 * "Klinik Pratama Karunia Husada", "Klinik Pratama UPN Veteran Yogyakarta"
 * all hit this in practice during September 2026 syncs — had to manually
 * pick the row whose phone matched the real WA chat history). This route
 * never does that: it joins wa_messages -> wa_contacts -> leads by ID the
 * whole way, so there's no name-based re-matching step to get wrong.
 *
 * This does NOT check whether a lead already exists in the team CRM
 * (sales.sahaibat.com) — that check needs a live session on that domain,
 * which this server has no access to. Still paste the result into
 * /lead-engine's "Score & import" as before; its own duplicate-phone
 * detection is what catches leads that are already there.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || todayWib();
  const { start, end } = wibDayRange(date);

  const contacts = await db.waContact.findMany({
    where: {
      leadId: { not: null },
      messages: { some: { sentAt: { gte: start, lte: end } } },
    },
    select: {
      lead: {
        select: {
          id: true,
          name: true,
          category: true,
          province: true,
          address: true,
          phoneNormalized: true,
        },
      },
    },
  });

  // One lead can have more than one wa_contacts row (rare, but seen — e.g.
  // a number gets re-linked). Dedupe by lead id so the CSV never lists the
  // same lead twice for the same day.
  const byLeadId = new Map<string, NonNullable<(typeof contacts)[number]["lead"]>>();
  for (const c of contacts) {
    if (c.lead && !byLeadId.has(c.lead.id)) byLeadId.set(c.lead.id, c.lead);
  }
  const leads = [...byLeadId.values()].sort((a, b) => a.name.localeCompare(b.name));

  const sourceRows = leads.map((l) => ({
    name: l.name,
    category: l.category,
    province: l.province,
    address: l.address,
    // Same "0-prefixed mobile, digits-only office" shape the SOP's SQL and
    // build-import-csv.mjs always used — /lead-engine's CSV parser expects
    // a plain Indonesian-format number, not the stored +62 form.
    phoneMobile: (l.phoneNormalized || "").replace("+62", "0"),
  }));

  const { rows, csv } = buildCsvRows(sourceRows, `SahAIbat DOK - Mapping sync ${date}`);

  return NextResponse.json({
    date,
    count: rows.length,
    unresolvedCityCount: rows.filter((r) => r.cityUnresolved).length,
    rows,
    csv,
  });
}
