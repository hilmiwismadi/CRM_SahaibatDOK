import Fastify from "fastify";
import { registerStatusRoute } from "./routes/status.js";

const app = Fastify({ logger: true });

registerStatusRoute(app);
// registerSendRoute / registerQrRoute / Baileys socket bootstrap land in
// Milestone 4 (WA bridge + chat linking) — see docs/ARCHITECTURE.md.

const port = Number(process.env.PORT ?? 3001);

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => app.log.info(`wa-bridge listening on :${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
