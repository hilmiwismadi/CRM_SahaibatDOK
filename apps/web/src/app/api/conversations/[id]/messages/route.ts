import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendOrSchedule, WaSendError } from "@/lib/waSend";
import { listPendingForPhone } from "@/lib/scheduledQueue";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const contact = await db.waContact.findUnique({
    where: { id },
    include: { lead: { select: { id: true, name: true, pipelineStage: true, pipelineStageDef: true } } },
  });
  if (!contact) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const messages = await db.waMessage.findMany({
    where: { waContactId: id },
    orderBy: { sentAt: "asc" },
  });

  const scheduled = await listPendingForPhone(contact.phoneNormalized);
  return NextResponse.json({ contact, messages, scheduled });
}

const sendSchema = z.object({
  body: z.string().min(1).max(4096),
  // "Kirim sekarang": skip the send guard (see lib/sendGuard.ts).
  force: z.boolean().optional(),
});

/** Reply within an existing conversation — the phone number is already known. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = sendSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const contact = await db.waContact.findUnique({ where: { id } });
  if (!contact) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  if (!contact.phoneNormalized) {
    return NextResponse.json(
      { error: "This WhatsApp contact has no known phone number yet (unresolved @lid)" },
      { status: 400 },
    );
  }

  try {
    const outcome = await sendOrSchedule({
      phoneNormalized: contact.phoneNormalized,
      body: parsed.data.body,
      leadId: contact.leadId,
      force: parsed.data.force,
    });
    if (outcome.kind === "scheduled") {
      return NextResponse.json(
        {
          scheduled: {
            id: outcome.scheduled.id,
            scheduledFor: outcome.scheduled.scheduledFor.toISOString(),
            reasons: outcome.reasons,
          },
        },
        { status: 202 },
      );
    }
    return NextResponse.json({ message: outcome.message });
  } catch (err) {
    if (err instanceof WaSendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
