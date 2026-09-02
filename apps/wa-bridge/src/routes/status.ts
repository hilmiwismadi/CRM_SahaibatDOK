import type { FastifyInstance } from "fastify";

/**
 * Connection status of the Baileys socket. Wired up for real in Milestone 4
 * (WA bridge + chat linking) — for now reports a static placeholder so the
 * rest of the stack has a stable endpoint to build against.
 */
export function registerStatusRoute(app: FastifyInstance) {
  app.get("/status", async () => {
    return { connected: false, note: "Baileys not wired up yet (Milestone 4)" };
  });
}
