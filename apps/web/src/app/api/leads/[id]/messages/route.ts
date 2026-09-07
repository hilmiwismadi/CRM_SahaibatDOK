import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getActiveContactNode } from "@/lib/contactChain";
import { sendOutboundToPhone, WaSendError } from "@/lib/waSend";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const contactNode = await getActiveContactNode(id);
  if (!contactNode.waContactId) {
    return NextResponse.json({ contact: null, messages: [] });
  }

  const [contact, messages] = await Promise.all([
    db.waContact.findUnique({ where: { id: contactNode.waContactId } }),
    db.waMessage.findMany({
      where: { waContactId: contactNode.waContactId },
      orderBy: { sentAt: "asc" },
    }),
  ]);

  return NextResponse.json({ contact, messages });
}

const sendSchema = z.object({
  body: z.string().min(1).max(4096),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = sendSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const contactNode = await getActiveContactNode(id);
  const phoneNormalized = contactNode.phoneNormalized;
  if (!phoneNormalized) {
    return NextResponse.json(
      { error: "The active contact for this lead has no phone number" },
      { status: 400 },
    );
  }

  try {
    const { waContact, message } = await sendOutboundToPhone({
      phoneNormalized,
      body: parsed.data.body,
      leadId: id,
    });

    if (!contactNode.waContactId) {
      await db.leadContactNode.update({
        where: { id: contactNode.id },
        data: { waContactId: waContact.id },
      });
    }

    return NextResponse.json({ message, contact: waContact });
  } catch (err) {
    if (err instanceof WaSendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
