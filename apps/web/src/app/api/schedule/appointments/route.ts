import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  leadId: z.string().uuid(),
  kind: z.enum(["demo_gmeet", "visit", "other"]),
  // Full ISO datetime with offset (the client converts its local pick).
  startsAt: z.string().datetime({ offset: true }),
  durationMin: z.number().int().min(5).max(24 * 60).default(60),
  location: z.string().max(500).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

/**
 * Creates a meeting. Also turns on the lead's `appointment` flag (the
 * existing "Appointment" tag / kanban column) on every linked WhatsApp
 * contact that doesn't have it yet, logging the same tag_change activity
 * /flag would — so a meeting booked here shows up in the funnel reports
 * exactly like one tagged from /chat. The flag is NOT cleared again when
 * the meeting is cancelled/done (flags stay manual, see schema.prisma).
 */
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { leadId, kind, startsAt, durationMin, location, note } = parsed.data;

  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { id: true } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const appointment = await db.$transaction(async (tx) => {
    const created = await tx.leadAppointment.create({
      data: {
        leadId,
        kind,
        startsAt: new Date(startsAt),
        durationMin,
        location: location?.trim() || null,
        note: note?.trim() || null,
      },
    });
    await tx.leadActivity.create({
      data: {
        leadId,
        type: "appointment_scheduled",
        payload: { appointmentId: created.id, kind, startsAt: created.startsAt.toISOString() },
      },
    });
    const unflagged = await tx.waContact.findMany({
      where: { leadId, appointment: false },
      select: { id: true },
    });
    for (const c of unflagged) {
      await tx.waContact.update({ where: { id: c.id }, data: { appointment: true } });
      await tx.leadActivity.create({
        data: { leadId, type: "tag_change", payload: { tag: "appointment", value: true, waContactId: c.id } },
      });
    }
    return created;
  });

  return NextResponse.json({ appointment }, { status: 201 });
}
