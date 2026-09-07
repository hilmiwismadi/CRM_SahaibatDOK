import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendOutboundToPhone, WaSendError } from "@/lib/waSend";

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

  return NextResponse.json({ contact, messages });
}

const sendSchema = z.object({
  body: z.string().min(1).max(4096),
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
    const { message } = await sendOutboundToPhone({
      phoneNormalized: contact.phoneNormalized,
      body: parsed.data.body,
      leadId: contact.leadId,
    });
    return NextResponse.json({ message });
  } catch (err) {
    if (err instanceof WaSendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
