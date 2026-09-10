import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { checkOnWhatsApp } from "../whatsapp/socket.js";

interface CheckBody {
  phones?: string[];
}

/**
 * Read-only WhatsApp-registration lookup for one or more phone numbers —
 * diagnostic tool, sends nothing. Useful for auditing scraped leads whose
 * only phone number might be a landline (see MapView.tsx's
 * isLikelyLandline() and sendText()'s NotOnWhatsAppError for the class of
 * problem this surfaces).
 */
export function registerCheckWaRoute(app: FastifyInstance) {
  app.post("/check-wa", async (req: FastifyRequest, reply: FastifyReply) => {
    const { phones } = (req.body ?? {}) as CheckBody;
    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return reply.status(400).send({ error: "phones (non-empty array) is required" });
    }
    try {
      const results = await checkOnWhatsApp(phones);
      return reply.send({ results });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const status = message.includes("not connected") ? 503 : 500;
      return reply.status(status).send({ error: message });
    }
  });
}
