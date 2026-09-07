import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizePhoneNumber } from "@sahaibat/shared";
import { db } from "@/lib/db";
import { extractProvince } from "@/lib/provinceExtract";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const stage = searchParams.get("stage") ?? "";
  const category = searchParams.get("category") ?? "";
  // "Location" filter — there's no dedicated city column, so this matches
  // against `address` directly (the option values come from
  // GET /api/leads/filter-options, which extracts known city names the
  // same way — see src/lib/cityExtract.ts).
  const city = searchParams.get("city") ?? "";
  const province = searchParams.get("province") ?? "";
  const businessType = searchParams.get("businessType") ?? "";

  const leads = await db.lead.findMany({
    where: {
      ...(stage && stage !== "all" ? { pipelineStage: stage } : {}),
      ...(category && category !== "all" ? { category } : {}),
      ...(businessType && businessType !== "all" ? { businessType } : {}),
      ...(city && city !== "all" ? { address: { contains: city, mode: "insensitive" } } : {}),
      ...(province && province !== "all" ? { province } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
              { address: { contains: search, mode: "insensitive" } },
              { phoneNormalized: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { firstScrapedAt: "desc" },
    include: { pipelineStageDef: true },
  });

  // Display-only fallback: derive from `address` for any row the bulk
  // backfill hasn't reached yet, so grouping/filtering by province is
  // useful immediately rather than waiting on that job. Doesn't persist —
  // the stored column (used for the WHERE filter above) fills in for real
  // once PUT /api/leads/[id] sets it.
  const enriched = leads.map((l) => (l.province ? l : { ...l, province: extractProvince(l.address) }));

  return NextResponse.json({ leads: enriched });
}

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  address: z.string().optional(),
  phoneRaw: z.string().optional(),
  phoneOffice: z.string().optional(),
  businessType: z.string().optional(),
  instagramUrl: z.string().optional(),
  notes: z.string().optional(),
  // Escape hatch for bulk/scripted imports (e.g. the manual-batch geocoding
  // pipeline) that already have real-world coordinates to attach up front.
  lat: z.number().optional(),
  lng: z.number().optional(),
  googleMapsUrl: z.string().optional(),
});

/** Manually-added lead from the dashboard — no scraper source, no coordinates by default. */
export async function POST(req: NextRequest) {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, category, address, phoneRaw, phoneOffice, businessType, instagramUrl, notes, lat, lng, googleMapsUrl } =
    parsed.data;
  const phoneNormalized = phoneRaw ? normalizePhoneNumber(phoneRaw) : null;

  const lead = await db.lead.create({
    data: {
      googlePlaceId: `manual-${randomUUID()}`,
      name,
      category: category || null,
      address: address || null,
      phoneRaw: phoneRaw || null,
      phoneNormalized,
      phoneOffice: phoneOffice || null,
      businessType: businessType || null,
      instagramUrl: instagramUrl || null,
      province: extractProvince(address),
      notes: notes || null,
      lat: lat ?? null,
      lng: lng ?? null,
      googleMapsUrl: googleMapsUrl || null,
    },
    include: { pipelineStageDef: true },
  });

  await db.leadActivity.create({
    data: { leadId: lead.id, type: "manual_edit", payload: { action: "created_manually" } },
  });

  return NextResponse.json({ lead });
}
