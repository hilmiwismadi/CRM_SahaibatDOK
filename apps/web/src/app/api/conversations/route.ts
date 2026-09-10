import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Global WhatsApp inbox — every wa_contact linked to a lead with at least
 * one message, newest message first, PLUS any lead-linked contact flagged
 * noWaAccount even with zero messages. That second case covers a send that
 * failed before ever reaching WhatsApp (sock.onWhatsApp() confirmed no
 * account — see waSend.ts's auto-tag-on-failure logic): no wa_messages row
 * exists, but the rep still needs to see "no WA contact" surfaced here
 * rather than the attempt silently vanishing. Backs the /chat page's
 * conversation list, which is not scoped to a single lead (a rep watches
 * for replies across all leads at once, same as real WhatsApp Web).
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
    where: { lead: { isNot: null }, OR: [{ messages: { some: {} } }, { noWaAccount: true }] },
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
      // No wa_messages row exists for a zero-message noWaAccount contact
      // (see doc comment above) — fall back to linkedAt so it still gets a
      // sensible spot in the newest-first ordering instead of sinking to
      // the very bottom under every real conversation.
      const sortAt = lastMessage?.sentAt ?? c.linkedAt ?? new Date(0);
      return {
        item: {
          id: c.id,
          jid: c.jid,
          phoneNormalized: c.phoneNormalized,
          displayName: c.displayName,
          lead: c.lead,
          lastMessage,
          needsReply,
          repliedByBot,
          needsOtherContact: c.needsOtherContact,
          needsFollowUp: c.needsFollowUp,
          noWaAccount: c.noWaAccount,
          appointment: c.appointment,
        },
        sortAt,
      };
    })
    .sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime())
    .map((x) => x.item);

  return NextResponse.json({ conversations });
}
