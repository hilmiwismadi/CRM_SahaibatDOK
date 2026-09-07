import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Global WhatsApp inbox — every wa_contact linked to a lead with at least
 * one message, newest message first. Backs the /chat page's conversation
 * list, which is not scoped to a single lead (a rep watches for replies
 * across all leads at once, same as real WhatsApp Web).
 *
 * Whitelisted to lead-linked contacts only (`lead: { isNot: null }`) — the
 * paired WhatsApp number is the operator's own personal account, so without
 * this filter every personal chat on that phone would show up here too.
 * A message from an unrecognized number still gets captured in wa_messages
 * (apps/wa-bridge's inbound handler) so nothing is silently dropped — it
 * just won't surface in this inbox until that number is added as a lead.
 */
export async function GET() {
  const contacts = await db.waContact.findMany({
    where: { messages: { some: {} }, lead: { isNot: null } },
    include: {
      lead: { select: { id: true, name: true, pipelineStage: true, pipelineStageDef: true } },
      messages: { orderBy: { sentAt: "desc" }, take: 1 },
    },
  });

  const conversations = contacts
    .map((c) => {
      const lastMessage = c.messages[0] ?? null;
      // The override (manual or bot) counts as "still in effect" only if
      // nothing has come in from the lead since it was set — a follow-up
      // message from the lead expires it automatically (see
      // schema.prisma's WaContact.repliedOverrideAt doc comment; a bot
      // reply plus a lead follow-up usually means they want a human now).
      const overrideActive = Boolean(c.repliedOverrideAt) && (!lastMessage || c.repliedOverrideAt! >= lastMessage.sentAt);
      const needsReply = lastMessage?.direction === "inbound" && !overrideActive;
      const repliedByBot = overrideActive && c.repliedOverrideKind === "bot";
      return {
        id: c.id,
        jid: c.jid,
        phoneNormalized: c.phoneNormalized,
        displayName: c.displayName,
        lead: c.lead,
        lastMessage,
        needsReply,
        repliedByBot,
        needsOtherContact: c.needsOtherContact,
      };
    })
    .sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.sentAt).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.sentAt).getTime() : 0;
      return bTime - aTime;
    });

  return NextResponse.json({ conversations });
}
