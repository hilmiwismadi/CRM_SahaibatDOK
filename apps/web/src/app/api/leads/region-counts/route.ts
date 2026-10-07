import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MAP_REGIONS } from "@/lib/mapRegions";

/** Lead count per /map region (only regions with at least one lead) plus the grand total — cheap, so the map can offer a picker before loading any lead. */
export async function GET() {
  const [total, counts] = await Promise.all([
    db.lead.count(),
    Promise.all(
      MAP_REGIONS.map((r) =>
        db.lead.count({ where: { OR: r.terms.map((t) => ({ address: { contains: t, mode: "insensitive" as const } })) } }),
      ),
    ),
  ]);

  const regions = MAP_REGIONS.map((r, i) => ({ key: r.key, label: r.label, count: counts[i] })).filter((r) => r.count > 0);
  return NextResponse.json({ total, regions });
}
