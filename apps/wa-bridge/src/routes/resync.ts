import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { triggerContactResync } from "../whatsapp/socket.js";

/**
 * Manual trigger for the proactive @lid<->phone resync (see
 * whatsapp/resync.ts). Mainly useful right after a re-pair on a fresh host,
 * so the user gets immediate confirmation instead of waiting for the next
 * natural reconnect or for each lead to message in first.
 */
export function registerResyncRoute(app: FastifyInstance) {
  app.post("/resync-contacts", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await triggerContactResync(req.log, true);
      if (!result.ran) {
        return reply.status(503).send({ ran: false, error: "WhatsApp is not connected" });
      }
      return reply.send({ ran: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return reply.status(500).send({ error: message });
    }
  });
}
