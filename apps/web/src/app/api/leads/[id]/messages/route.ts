import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { phoneToJid } from "@sahaibat/shared";
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

  // lead_contact_nodes.wa_contact_id is UNIQUE, but several leads can share
  // one phone number (e.g. two listings of the same clinic) and therefore
  // one wa_contact — only one of their nodes can hold that link. A node
  // without the link falls back to the wa_contact for its own phone, so
  // every lead on a shared number sees the same conversation instead of an
  // empty history.
  let waContactId = contactNode.waContactId;
  if (!waContactId && contactNode.phoneNormalized) {
    const shared = await db.waContact.findUnique({
      where: { jid: phoneToJid(contactNode.phoneNormalized) },
      select: { id: true },
    });
    waContactId = shared?.id ?? null;
  }
  if (!waContactId) {
    return NextResponse.json({ contact: null, messages: [] });
  }

  const [contact, messages] = await Promise.all([
    db.waContact.findUnique({ where: { id: waContactId } }),
    db.waMessage.findMany({
      where: { waContactId },
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

    // lead_contact_nodes.wa_contact_id is UNIQUE, but several leads can share
    // one phone number (e.g. a clinic group's front-desk line) and therefore
    // one wa_contact. If another node already owns this wa_contact, skip the
    // link — the message is already sent and recorded at this point, so
    // throwing here would show "failed" for a message that was delivered.
    if (!contactNode.waContactId) {
      const taken = await db.leadContactNode.findUnique({
        where: { waContactId: waContact.id },
        select: { id: true },
      });
      if (!taken) {
        await db.leadContactNode.update({
          where: { id: contactNode.id },
          data: { waContactId: waContact.id },
        });
      }
    }

    return NextResponse.json({ message, contact: waContact });
  } catch (err) {
    if (err instanceof WaSendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
