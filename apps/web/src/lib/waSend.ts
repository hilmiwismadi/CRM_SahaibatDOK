import { phoneToJid } from "@sahaibat/shared";
import { db } from "@/lib/db";
import type { WaContact, WaMessage } from "@prisma/client";

export class WaSendError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface SendOutboundParams {
  phoneNormalized: string;
  body: string;
  /** Attached to the wa_contacts row if it doesn't already have a lead. */
  leadId?: string | null;
}

/**
 * Sends a WhatsApp message via wa-bridge's dumb `/send` transport, then
 * records it: upserts wa_contacts, creates the wa_messages row, and — the
 * one documented automation rule (docs/ARCHITECTURE.md) — advances a `new`
 * lead to `contacted` on its first outbound message. Shared by both the
 * per-lead composer (api/leads/[id]/messages) and the global inbox
 * (api/conversations/[id]/messages) so this business rule lives in exactly
 * one place.
 */
export async function sendOutboundToPhone(
  params: SendOutboundParams,
): Promise<{ waContact: WaContact; message: WaMessage }> {
  const bridgeUrl = process.env.WA_BRIDGE_INTERNAL_URL;
  if (!bridgeUrl) {
    throw new WaSendError("WA_BRIDGE_INTERNAL_URL is not configured", 500);
  }

  let sendResult: { waMessageId: string; sentAt: string };
  try {
    const res = await fetch(`${bridgeUrl}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNormalized: params.phoneNormalized, body: params.body }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new WaSendError(payload.error ?? `WA bridge returned ${res.status}`, res.status === 503 ? 503 : 502);
    }
    sendResult = payload as { waMessageId: string; sentAt: string };
  } catch (err) {
    if (err instanceof WaSendError) throw err;
    throw new WaSendError("Could not reach the WhatsApp bridge", 503);
  }

  const jid = phoneToJid(params.phoneNormalized);

  return db.$transaction(async (tx) => {
    const waContact = await tx.waContact.upsert({
      where: { jid },
      create: {
        jid,
        phoneNormalized: params.phoneNormalized,
        leadId: params.leadId ?? undefined,
        linkedAt: params.leadId ? new Date() : undefined,
      },
      update: params.leadId ? { leadId: params.leadId, linkedAt: new Date() } : {},
    });

    const message = await tx.waMessage.create({
      data: {
        waContactId: waContact.id,
        waMessageId: sendResult.waMessageId,
        direction: "outbound",
        body: params.body,
        sentAt: new Date(sendResult.sentAt),
      },
    });

    const leadId = waContact.leadId;
    if (leadId) {
      await tx.leadActivity.create({
        data: {
          leadId,
          type: "wa_message_sent",
          payload: { waContactId: waContact.id, waMessageId: message.waMessageId },
        },
      });

      const lead = await tx.lead.findUnique({ where: { id: leadId } });
      if (lead?.pipelineStage === "new") {
        const outboundCount = await tx.waMessage.count({
          where: { direction: "outbound", waContact: { leadId } },
        });
        if (outboundCount === 1) {
          await tx.lead.update({ where: { id: leadId }, data: { pipelineStage: "contacted" } });
          await tx.leadActivity.create({
            data: { leadId, type: "stage_change", payload: { from: "new", to: "contacted" } },
          });
        }
      }
    }

    return { waContact, message };
  });
}
