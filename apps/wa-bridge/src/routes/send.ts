import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendText, NotOnWhatsAppError } from "../whatsapp/socket.js";

interface SendBody {
  phoneNormalized?: string;
  body?: string;
}

/**
 * Deliberately a dumb transport: no Postgres writes here. apps/web is the
 * synchronous caller for every outbound send, and it owns the Prisma schema
 * + the "first outbound message auto-advances a `new` lead" business rule —
 * see docs/ARCHITECTURE.md and apps/web/src/app/api/leads/[id]/messages/route.ts.
 */
export function registerSendRoute(app: FastifyInstance) {
  app.post("/send", async (req: FastifyRequest, reply: FastifyReply) => {
    const { phoneNormalized, body } = (req.body ?? {}) as SendBody;
    if (!phoneNormalized || !body) {
      return reply.status(400).send({ error: "phoneNormalized and body are required" });
    }

    try {
      const result = await sendText(phoneNormalized, body);
      return reply.send({
        sent: true,
        waMessageId: result.waMessageId,
        sentAt: result.sentAt.toISOString(),
      });
    } catch (err) {
      if (err instanceof NotOnWhatsAppError) {
        return reply.status(422).send({ error: err.message, code: "not_on_whatsapp" });
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      const status = message.includes("not connected") ? 503 : 500;
      return reply.status(status).send({ error: message });
    }
  });
}
