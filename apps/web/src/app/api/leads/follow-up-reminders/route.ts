import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Backs the sidebar's reminder popup (see AppSidebar.tsx) — every
 * lead-linked contact currently flagged needsFollowUp with a followUpAt
 * date that has arrived (today or earlier), oldest due date first. A
 * contact past its date stays listed (not silently dropped) until the rep
 * clears or reschedules the tag from /chat, same as every other standing
 * flag in this app never auto-expiring.
 */
export async function GET() {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const contacts = await db.waContact.findMany({
    where: {
      needsFollowUp: true,
      followUpAt: { lte: endOfToday },
      lead: { isNot: null },
    },
    select: {
      id: true,
      followUpAt: true,
      lead: { select: { id: true, name: true } },
    },
    orderBy: { followUpAt: "asc" },
  });

  const reminders = contacts
    .filter((c) => c.lead)
    .map((c) => ({
      waContactId: c.id,
      leadId: c.lead!.id,
      leadName: c.lead!.name,
      followUpAt: c.followUpAt,
    }));

  return NextResponse.json({ reminders });
}
