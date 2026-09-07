import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizePhoneNumber } from "@sahaibat/shared";
import { db } from "@/lib/db";
import { ensureRootContactNode } from "@/lib/contactChain";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  await ensureRootContactNode(id);
  const contacts = await db.leadContactNode.findMany({
    where: { leadId: id },
    include: { waContact: true },
    orderBy: { createdAt: "asc" },
  });

  const activeContactId = lead.activeContactNodeId ?? contacts.find((c) => c.isRoot)?.id ?? null;

  return NextResponse.json({ contacts, activeContactId });
}

const createSchema = z.object({
  parentId: z.string().uuid(),
  displayName: z.string().min(1),
  phoneRaw: z.string().min(1),
  role: z.string().optional(),
  handoffNote: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const parent = await db.leadContactNode.findUnique({ where: { id: parsed.data.parentId } });
  if (!parent || parent.leadId !== id) {
    return NextResponse.json({ error: "parentId does not belong to this lead" }, { status: 400 });
  }

  const phoneNormalized = normalizePhoneNumber(parsed.data.phoneRaw);
  if (!phoneNormalized) {
    return NextResponse.json({ error: "Could not parse a valid phone number" }, { status: 400 });
  }

  // Best-effort link to an existing conversation for this phone, if one
  // exists and isn't already claimed by another node.
  const existingWaContact = await db.waContact.findFirst({ where: { phoneNormalized } });
  let waContactId: string | undefined;
  if (existingWaContact) {
    const alreadyClaimed = await db.leadContactNode.findUnique({
      where: { waContactId: existingWaContact.id },
    });
    if (!alreadyClaimed) waContactId = existingWaContact.id;
  }

  const contact = await db.leadContactNode.create({
    data: {
      leadId: id,
      parentId: parsed.data.parentId,
      phoneNormalized,
      displayName: parsed.data.displayName,
      role: parsed.data.role,
      handoffNote: parsed.data.handoffNote,
      waContactId,
    },
    include: { waContact: true },
  });

  return NextResponse.json({ contact });
}
