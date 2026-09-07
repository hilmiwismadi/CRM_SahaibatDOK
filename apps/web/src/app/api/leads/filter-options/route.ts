import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractCity } from "@/lib/cityExtract";
import { extractProvince } from "@/lib/provinceExtract";

/** Distinct dropdown options for the dashboard's Category/Location/Province filters. */
export async function GET() {
  const leads = await db.lead.findMany({ select: { category: true, address: true, province: true } });

  const categories = Array.from(
    new Set(leads.map((l) => l.category).filter((c): c is string => Boolean(c && c.trim()))),
  ).sort((a, b) => a.localeCompare(b));

  const cities = Array.from(
    new Set(leads.map((l) => extractCity(l.address)).filter((c): c is string => c !== null)),
  ).sort((a, b) => a.localeCompare(b));

  // Prefer the persisted `province` column (set by /api/leads/[id]'s PUT,
  // or backfilled in bulk); fall back to deriving from `address` on the
  // fly for any row that hasn't been backfilled yet, so the filter is
  // immediately useful without waiting on that backfill.
  const provinces = Array.from(
    new Set(leads.map((l) => l.province ?? extractProvince(l.address)).filter((p): p is string => p !== null)),
  ).sort((a, b) => a.localeCompare(b));

  return NextResponse.json({ categories, cities, provinces });
}
