import "dotenv/config";
import Fastify from "fastify";
import { registerStatusRoute } from "./routes/status.js";
import { registerQrRoute } from "./routes/qr.js";
import { registerSendRoute } from "./routes/send.js";
import { registerResyncRoute } from "./routes/resync.js";
import { registerCheckWaRoute } from "./routes/check-wa.js";
import { initWhatsApp } from "./whatsapp/socket.js";

const app = Fastify({ logger: true });

registerStatusRoute(app);
registerQrRoute(app);
registerSendRoute(app);
registerResyncRoute(app);
registerCheckWaRoute(app);

const port = Number(process.env.PORT ?? 3001);

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => app.log.info(`wa-bridge listening on :${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });

initWhatsApp(app.log).catch((err) => {
  app.log.error({ err }, "failed to initialize WhatsApp socket");
});
