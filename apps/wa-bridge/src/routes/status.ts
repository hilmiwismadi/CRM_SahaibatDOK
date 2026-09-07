import type { FastifyInstance } from "fastify";
import { getConnectionStatus } from "../whatsapp/socket.js";

export function registerStatusRoute(app: FastifyInstance) {
  app.get("/status", async () => getConnectionStatus());
}
