import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  needsOtherContact: z.boolean(),
});

/**
 * Toggles the standing "needs other contact" flag (WhatsApp isn't working
 * for this lead — no response, wrong number, etc — try email/phone/other
 * instead). Separate from the /replied route: unlike that override, this
 * flag does not auto-expire on a new inbound message — see schema.prisma's
 * WaContact.needsOtherContact doc comment.
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
      data: { needsOtherContact: parsed.data.needsOtherContact },
    });
    return NextResponse.json({ contact });
  } catch {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
}
