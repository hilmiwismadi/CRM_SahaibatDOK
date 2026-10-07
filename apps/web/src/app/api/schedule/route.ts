import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Backs /schedule — everything that has a date: active follow-ups (from
 * WaContact.followUpAt) and meetings (LeadAppointment). Follow-ups are
 * returned unfiltered by range (there are only ever a few dozen active at
 * once and the page also wants the overdue ones from earlier months);
 * appointments are limited to [from, to) when given, else everything from
 * the last 60 days on.
 *
 * `followUpAt` for a date-only follow-up is that date at 00:00 UTC —
 * clients must read the day from the ISO string, not from local time, when
 * `hasTime` is false.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const fromDate = from ? new Date(from) : new Date(Date.now() - 60 * 86400000);
  const toDate = to ? new Date(to) : null;
  if (Number.isNaN(fromDate.getTime()) || (toDate && Number.isNaN(toDate.getTime()))) {
    return NextResponse.json({ error: "Invalid from/to" }, { status: 400 });
  }

  const [contacts, appointments] = await Promise.all([
    db.waContact.findMany({
      where: { needsFollowUp: true, followUpAt: { not: null }, lead: { isNot: null } },
      select: {
        id: true,
        followUpAt: true,
        followUpHasTime: true,
        followUpNote: true,
        lead: { select: { id: true, name: true } },
      },
      orderBy: { followUpAt: "asc" },
    }),
    db.leadAppointment.findMany({
      where: { startsAt: { gte: fromDate, ...(toDate ? { lt: toDate } : {}) } },
      include: { lead: { select: { id: true, name: true } } },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  return NextResponse.json({
    followUps: contacts.map((c) => ({
      waContactId: c.id,
      leadId: c.lead!.id,
      leadName: c.lead!.name,
      followUpAt: c.followUpAt,
      hasTime: c.followUpHasTime,
      note: c.followUpNote,
    })),
    appointments: appointments.map((a) => ({
      id: a.id,
      leadId: a.lead.id,
      leadName: a.lead.name,
      kind: a.kind,
      startsAt: a.startsAt,
      durationMin: a.durationMin,
      location: a.location,
      note: a.note,
      status: a.status,
    })),
  });
}
