import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { listUnlinkedContacts, promoteContactToLead } from "../whatsapp/db-writer.js";

interface PromoteBody {
  name?: string;
}

/**
 * Surfaces wa_contacts that messaged in but never matched a lead — mostly
 * the account owner's personal contacts (this bridge is a personal
 * WhatsApp number, see purgeStalePersonalContacts's doc comment), but
 * occasionally a genuine new lead who wrote in before ever being added to
 * the CRM. Lets the rep tell the two apart and promote the real one
 * before the retention purge drops it.
 */
export function registerUnlinkedContactsRoute(app: FastifyInstance) {
  app.get("/unlinked-contacts", async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const contacts = await listUnlinkedContacts();
      return reply.send({ contacts });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return reply.status(500).send({ error: message });
    }
  });

  app.post("/unlinked-contacts/:id/promote", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const { name } = (req.body ?? {}) as PromoteBody;
    if (!name?.trim()) {
      return reply.status(400).send({ error: "name is required" });
    }
    try {
      const result = await promoteContactToLead(id, name.trim());
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return reply.status(400).send({ error: message });
    }
  });
}
