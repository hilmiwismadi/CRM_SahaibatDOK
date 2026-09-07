import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const activeSchema = z.object({
  contactId: z.string().uuid(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = activeSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const node = await db.leadContactNode.findUnique({ where: { id: parsed.data.contactId } });
  if (!node || node.leadId !== id) {
    return NextResponse.json({ error: "contactId does not belong to this lead" }, { status: 400 });
  }

  const [updated] = await db.$transaction([
    db.lead.update({
      where: { id },
      data: { activeContactNodeId: node.id },
      include: { pipelineStageDef: true, activeContactNode: true },
    }),
    db.leadActivity.create({
      data: {
        leadId: id,
        type: "contact_chain_updated",
        payload: { from: lead.activeContactNodeId, to: node.id },
      },
    }),
  ]);

  return NextResponse.json({ lead: updated });
}
