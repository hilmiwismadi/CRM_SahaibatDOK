import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  replied: z.boolean(),
  // Only meaningful when replied: true — "manual" (a person replied
  // outside this CRM) or "bot" (an automated reply). Defaults to "manual".
  kind: z.enum(["manual", "bot"]).optional(),
});

/**
 * Manual "mark as replied" toggle — for replies that happened outside this
 * CRM's visibility (answered from the paired phone directly, or by an
 * external bot) so there's no wa_messages row to make the room stop
 * showing as needing a reply on its own. Expires automatically the moment
 * a newer inbound message arrives (see schema.prisma's WaContact doc
 * comment) — a lead following up after a bot reply usually means they
 * want a human. `replied: false` clears the override early.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const contact = await db.waContact.update({
      where: { id },
      data: parsed.data.replied
        ? { repliedOverrideAt: new Date(), repliedOverrideKind: parsed.data.kind ?? "manual" }
        : { repliedOverrideAt: null, repliedOverrideKind: null },
    });
    return NextResponse.json({ contact });
  } catch {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
}
