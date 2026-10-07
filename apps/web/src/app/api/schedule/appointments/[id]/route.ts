import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z
  .object({
    status: z.enum(["scheduled", "done", "cancelled"]),
    startsAt: z.string().datetime({ offset: true }),
    durationMin: z.number().int().min(5).max(24 * 60),
    kind: z.enum(["demo_gmeet", "visit", "other"]),
    location: z.string().max(500).nullable(),
    note: z.string().max(500).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

/** Edit / reschedule / mark done or cancelled. Any subset of fields. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { startsAt, location, note, ...rest } = parsed.data;

  try {
    const appointment = await db.$transaction(async (tx) => {
      const before = await tx.leadAppointment.findUniqueOrThrow({ where: { id } });
      const updated = await tx.leadAppointment.update({
        where: { id },
        data: {
          ...rest,
          ...(startsAt ? { startsAt: new Date(startsAt) } : {}),
          ...(location !== undefined ? { location: location?.trim() || null } : {}),
          ...(note !== undefined ? { note: note?.trim() || null } : {}),
        },
      });
      if (rest.status && rest.status !== before.status) {
        await tx.leadActivity.create({
          data: {
            leadId: updated.leadId,
            type: "appointment_" + rest.status,
            payload: { appointmentId: id, kind: updated.kind, startsAt: updated.startsAt.toISOString() },
          },
        });
      }
      return updated;
    });
    return NextResponse.json({ appointment });
  } catch {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.leadAppointment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
}
