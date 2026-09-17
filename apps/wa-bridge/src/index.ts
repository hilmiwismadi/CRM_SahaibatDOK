import "dotenv/config";
import Fastify from "fastify";
import { registerStatusRoute } from "./routes/status.js";
import { registerQrRoute } from "./routes/qr.js";
import { registerSendRoute } from "./routes/send.js";
import { registerResyncRoute } from "./routes/resync.js";
import { registerCheckWaRoute } from "./routes/check-wa.js";
import { registerUnlinkedContactsRoute } from "./routes/unlinked-contacts.js";
import { initWhatsApp } from "./whatsapp/socket.js";
import { purgeStalePersonalContacts } from "./whatsapp/db-writer.js";

const app = Fastify({ logger: true });

registerStatusRoute(app);
registerQrRoute(app);
registerSendRoute(app);
registerResyncRoute(app);
registerCheckWaRoute(app);
registerUnlinkedContactsRoute(app);

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

// Personal-contact retention: this bridge runs on the account owner's own
// WhatsApp number, so every inbound message from a number that never
// matches a lead (friends, family, anyone unrelated to the CRM) still gets
// stored — see inbound.ts — purely so a genuine new lead who wrote in
// before ever being added to the CRM can be caught and promoted (see
// /unlinked-contacts) instead of losing that history outright. This is
// the other half of that trade-off: anything not promoted within the
// retention window is deleted, so personal chats don't accumulate in the
// CRM's database forever.
const RETENTION_DAYS = Number(process.env.PERSONAL_CONTACT_RETENTION_DAYS ?? 14);
const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;
function runPurge() {
  purgeStalePersonalContacts(RETENTION_DAYS)
    .then((count) => {
      if (count > 0) app.log.info({ count, RETENTION_DAYS }, "purged stale personal (non-lead) wa_contacts");
    })
    .catch((err) => app.log.error({ err }, "personal contact purge failed"));
}
runPurge();
setInterval(runPurge, PURGE_INTERVAL_MS);
