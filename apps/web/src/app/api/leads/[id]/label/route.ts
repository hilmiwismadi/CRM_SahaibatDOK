import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const LABELS = ["dental", "aesthetic", "low_rating", "government_affiliate", "other"] as const;

const schema = z.object({
  // null clears the label.
  label: z.enum(LABELS).nullable(),
  note: z.string().trim().max(500).optional(),
});

/** Sets/clears the "why we're not contacting this lead" label from /map. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { label, note } = parsed.data;
  if (label === "other" && !note) {
    return NextResponse.json({ error: "Reason is required for 'Other'" }, { status: 400 });
  }

  const existing = await db.lead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const labelNote = label === "other" ? note! : null;
  if (existing.label === label && existing.labelNote === labelNote) {
    return NextResponse.json({ lead: existing });
  }

  const [lead] = await db.$transaction([
    db.lead.update({ where: { id }, data: { label, labelNote }, include: { pipelineStageDef: true } }),
    db.leadActivity.create({
      data: {
        leadId: id,
        type: "label_change",
        payload: { from: existing.label, to: label, note: labelNote },
      },
    }),
  ]);

  return NextResponse.json({ lead });
}
