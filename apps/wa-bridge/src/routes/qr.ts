import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { toBuffer } from "qrcode";
import { getConnectionStatus, getLatestQr } from "../whatsapp/socket.js";

export function registerQrRoute(app: FastifyInstance) {
  app.get("/qr", async (req: FastifyRequest, reply: FastifyReply) => {
    const status = getConnectionStatus();
    if (status.connected) {
      return reply.send({ connected: true, qr: null });
    }

    const qr = getLatestQr();
    if (!qr) {
      return reply.status(202).send({ connected: false, qr: null, note: "socket not ready yet" });
    }

    const { format } = req.query as { format?: string };
    if (format === "text") {
      return reply.send({ qr });
    }

    const png = await toBuffer(qr, { type: "png", margin: 1, width: 320 });
    return reply.type("image/png").send(png);
  });
}
