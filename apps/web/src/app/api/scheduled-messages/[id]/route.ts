import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendOutboundToPhone, WaSendError } from "@/lib/waSend";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("send_now") }),
  z.object({ action: z.literal("reschedule"), scheduledFor: z.string().datetime() }),
  z.object({ action: z.literal("retry") }),
]);

/**
 * Edit one queued message:
 *  cancel      – drop it (only while queued/failed)
 *  reschedule  – move it to another time (ISO instant)
 *  retry       – put a failed row back in the queue for "now"
 *  send_now    – the rep overrides the send guard and sends immediately
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const row = await db.scheduledMessage.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.status !== "queued" && row.status !== "failed") {
    return NextResponse.json({ error: `Pesan sudah ${row.status}` }, { status: 409 });
  }

  const a = parsed.data;
  if (a.action === "cancel") {
    await db.scheduledMessage.update({ where: { id }, data: { status: "cancelled" } });
    return NextResponse.json({ ok: true });
  }
  if (a.action === "reschedule") {
    await db.scheduledMessage.update({
      where: { id },
      data: { status: "queued", scheduledFor: new Date(a.scheduledFor), lastError: null },
    });
    return NextResponse.json({ ok: true });
  }
  if (a.action === "retry") {
    await db.scheduledMessage.update({
      where: { id },
      data: { status: "queued", scheduledFor: new Date(), attempts: 0, lastError: null },
    });
    return NextResponse.json({ ok: true });
  }

  // send_now: claim first (queued/failed -> sending) so the dispatcher cannot send it too.
  const claimed = await db.scheduledMessage.updateMany({
    where: { id, status: { in: ["queued", "failed"] } },
    data: { status: "sending" },
  });
  if (claimed.count === 0) return NextResponse.json({ error: "Pesan sedang diproses" }, { status: 409 });
  try {
    const { message } = await sendOutboundToPhone({
      phoneNormalized: row.phoneNormalized,
      body: row.body,
      leadId: row.leadId,
    });
    await db.scheduledMessage.update({
      where: { id },
      data: { status: "sent", sentAt: new Date(), sentMessageId: message.id, lastError: null },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.scheduledMessage.update({ where: { id }, data: { status: "failed", lastError: msg } });
    return NextResponse.json({ error: msg }, { status: err instanceof WaSendError ? err.status : 500 });
  }
}
