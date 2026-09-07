import type { BaileysEventMap, WASocket } from "baileys";
import type { FastifyBaseLogger } from "fastify";
import shared from "@sahaibat/shared";
const { jidToPhone, normalizePhoneNumber, phoneToJid } = shared;
import {
  backfillPhoneForLid,
  getLeadIdForWaContact,
  insertLeadActivity,
  insertWaMessage,
  linkContactToLead,
  upsertWaContact,
} from "./db-writer.js";

function extractText(message: BaileysEventMap["messages.upsert"]["messages"][number]): string | null {
  const m = message.message;
  if (!m) return null;
  return m.conversation ?? m.extendedTextMessage?.text ?? m.imageMessage?.caption ?? m.videoMessage?.caption ?? null;
}

/**
 * Resolves a phone number for an inbound message's sender JID.
 * - `@s.whatsapp.net` → parsed directly.
 * - `@lid` (WhatsApp Linked-Device internal id, used for phone-number-privacy
 *   senders) → resolved via Baileys' native lidMapping store. May return
 *   null if WhatsApp hasn't sent us that mapping yet (or the sender has
 *   phone-number privacy enabled and it may never resolve) — this is
 *   expected and must degrade gracefully, not crash or drop the message.
 */
async function resolvePhoneForJid(sock: WASocket, remoteJid: string): Promise<string | null> {
  if (remoteJid.endsWith("@s.whatsapp.net")) {
    return jidToPhone(remoteJid);
  }
  if (remoteJid.endsWith("@lid")) {
    const resolvedPn = await sock.signalRepository.lidMapping.getPNForLID(remoteJid);
    if (!resolvedPn) return null;
    // resolvedPn may come back as a bare number or a full JID depending on
    // the mapping source — normalize either shape.
    return jidToPhone(resolvedPn) ?? normalizePhoneNumber(resolvedPn.split("@")[0]?.split(":")[0] ?? resolvedPn);
  }
  return null;
}

export async function handleIncomingMessages(
  sock: WASocket,
  { messages }: BaileysEventMap["messages.upsert"],
  logger: FastifyBaseLogger,
): Promise<void> {
  for (const message of messages) {
    try {
      if (message.key.fromMe) continue; // outbound writes are handled by apps/web's /send caller
      const remoteJid = message.key.remoteJid;
      if (!remoteJid || remoteJid.endsWith("@g.us")) continue; // groups out of scope
      if (!message.message) continue; // protocol/system messages (reactions, receipts, etc.)

      const phoneNormalized = await resolvePhoneForJid(sock, remoteJid);
      // Once a phone number is known, address by the canonical
      // phoneToJid(...) JID — the same one apps/web's outbound sender
      // always uses — so a reply that arrives via a different JID (e.g.
      // an @lid Linked-Device session) still lands in the same
      // conversation instead of creating a new one. upsertWaContact also
      // matches by phone_normalized first as a second line of defense.
      const waContactId = await upsertWaContact({
        jid: phoneNormalized ? phoneToJid(phoneNormalized) : remoteJid,
        phoneNormalized,
        displayName: message.pushName ?? null,
      });

      if (phoneNormalized) {
        await linkContactToLead(waContactId, phoneNormalized);
      }

      const waMessageId = message.key.id ?? `${remoteJid}-${Date.now()}`;
      const sentAt = message.messageTimestamp
        ? new Date(Number(message.messageTimestamp) * 1000)
        : new Date();

      const inserted = await insertWaMessage({
        waContactId,
        waMessageId,
        direction: "inbound",
        body: extractText(message),
        rawPayload: message,
        sentAt,
      });

      if (inserted) {
        const leadId = await getLeadIdForWaContact(waContactId);
        if (leadId) {
          await insertLeadActivity(leadId, "wa_message_received", {
            waContactId,
            waMessageId,
          });
        }
      }
    } catch (err) {
      // Never let one bad message take down the socket's event loop, and
      // never silently swallow it either.
      logger.error({ err, key: message.key }, "failed to process inbound WhatsApp message");
    }
  }
}

export async function handleLidMappingUpdate(
  mapping: BaileysEventMap["lid-mapping.update"],
  logger: FastifyBaseLogger,
): Promise<void> {
  try {
    const phoneNormalized = normalizePhoneNumber(mapping.pn);
    if (!phoneNormalized) return;
    const waContactId = await backfillPhoneForLid(mapping.lid, phoneNormalized);
    if (waContactId) {
      await linkContactToLead(waContactId, phoneNormalized);
      logger.info({ lid: mapping.lid, waContactId }, "backfilled phone number for previously-unresolved @lid contact");
    }
  } catch (err) {
    logger.error({ err, mapping }, "failed to handle lid-mapping.update");
  }
}
