import type { WASocket } from "baileys";
import type { FastifyBaseLogger } from "fastify";
import shared from "@sahaibat/shared";
const { phoneToJid } = shared;
import { getAllLeadPhoneNumbers } from "./db-writer.js";

const BATCH_SIZE = 50;

/**
 * Proactively re-establishes the @lid <-> phone-number mapping for every
 * known lead, instead of waiting for each contact to message us first.
 *
 * Why this exists: Baileys' lidMapping cache (sock.signalRepository.lidMapping)
 * lives inside auth_state's signal key store. Whenever the bot re-pairs (new
 * QR scan — e.g. auth_state was lost moving to a new host, see
 * Context/SahaibatExplanation/4.ChatHistoryConcern.md) that cache starts
 * empty, and WhatsApp is very likely to hand out a *different* @lid for the
 * same real-world contact under the new session. Until we relearn a given
 * contact's mapping, an inbound reply from them arrives as an unresolved
 * @lid with phoneNormalized = null (see inbound.ts's resolvePhoneForJid) and
 * won't auto-link to the existing lead/conversation.
 *
 * getLIDsForPNs() queries WhatsApp's USync servers directly for the LID
 * belonging to each phone number and persists the result via Baileys'
 * storeLIDPNMappings — populating the exact cache getPNForLID() reads later.
 * Running this right after every successful connection (not just fresh
 * pairings — cheap and self-healing either way) means most contacts'
 * mappings are already warm by the time they reply, so inbound messages
 * resolve immediately instead of depending on the passive lid-mapping.update
 * fallback in inbound.ts.
 */
export async function resyncLeadContacts(sock: WASocket, logger: FastifyBaseLogger): Promise<void> {
  const phones = await getAllLeadPhoneNumbers();
  if (phones.length === 0) return;

  logger.info({ count: phones.length }, "resyncing WA contact LID mappings for known leads");

  let resolved = 0;
  for (let i = 0; i < phones.length; i += BATCH_SIZE) {
    const batch = phones.slice(i, i + BATCH_SIZE).map((p) => phoneToJid(p));
    try {
      const result = await sock.signalRepository.lidMapping.getLIDsForPNs(batch);
      resolved += result?.length ?? 0;
    } catch (err) {
      logger.warn({ err, batchStart: i }, "getLIDsForPNs batch failed during contact resync");
    }
  }

  logger.info({ total: phones.length, resolved }, "WA contact LID resync finished");
}
