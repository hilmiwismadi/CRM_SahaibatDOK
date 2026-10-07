import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Lead picker for /schedule's "add" form. Returns the lead's WhatsApp
 * contact id (when it has one) because follow-ups are stored on WaContact —
 * a lead without a contact can still get a meeting but not a follow-up.
 */
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ leads: [] });

  const leads = await db.lead.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      address: true,
      waContacts: { select: { id: true }, orderBy: { linkedAt: "desc" }, take: 1 },
    },
    orderBy: { name: "asc" },
    take: 10,
  });

  return NextResponse.json({
    leads: leads.map((l) => ({
      id: l.id,
      name: l.name,
      address: l.address,
      waContactId: l.waContacts[0]?.id ?? null,
    })),
  });
}
