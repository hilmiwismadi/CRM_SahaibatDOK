import { join } from "node:path";
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  type WASocket,
} from "baileys";
import { Boom } from "@hapi/boom";
import type { FastifyBaseLogger } from "fastify";
import shared from "@sahaibat/shared";
const { phoneToJid } = shared;
import { handleIncomingMessages, handleLidMappingUpdate } from "./inbound.js";
import { resyncLeadContacts } from "./resync.js";

// Matches the `wa-session` Docker volume mounted at
// /repo/apps/wa-bridge/auth_state (docker-compose.yml) — process.cwd() is
// apps/wa-bridge both under `tsx watch` locally and the Dockerfile's WORKDIR.
const AUTH_DIR = join(process.cwd(), "auth_state");
const RECONNECT_DELAY_MS = 3000;

const RESYNC_MIN_INTERVAL_MS = 10 * 60 * 1000; // avoid re-querying WhatsApp on every flappy reconnect

let sock: WASocket | undefined;
let latestQr: string | undefined;
let connected = false;
let lastConnectedAt: string | undefined;
let lastResyncAt = 0;

/**
 * Re-establishes @lid<->phone mappings for every known lead (see resync.ts).
 * Safe to call anytime the socket is connected; debounced so a burst of
 * reconnects doesn't hammer WhatsApp's USync servers. `force` bypasses the
 * debounce — used by the manual "Resync Contacts" trigger (POST
 * /resync-contacts) so the user gets immediate feedback right after a
 * re-pair instead of waiting up to RESYNC_MIN_INTERVAL_MS.
 */
export async function triggerContactResync(logger: FastifyBaseLogger, force = false): Promise<{ ran: boolean }> {
  if (!sock || !connected) return { ran: false };
  if (!force && Date.now() - lastResyncAt < RESYNC_MIN_INTERVAL_MS) return { ran: false };
  lastResyncAt = Date.now();
  await resyncLeadContacts(sock, logger);
  return { ran: true };
}

export function getConnectionStatus() {
  return { connected, hasQr: Boolean(latestQr), lastConnectedAt: lastConnectedAt ?? null };
}

export function getLatestQr(): string | undefined {
  return latestQr;
}

export async function initWhatsApp(logger: FastifyBaseLogger): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: logger.child({ module: "baileys" }),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQr = qr;
    }

    if (connection === "open") {
      connected = true;
      latestQr = undefined;
      lastConnectedAt = new Date().toISOString();
      logger.info("WhatsApp connection open");
      triggerContactResync(logger).catch((err) => logger.error({ err }, "contact resync failed on connect"));
    } else if (connection === "close") {
      connected = false;
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      logger.warn({ statusCode, loggedOut }, "WhatsApp connection closed");

      if (loggedOut) {
        // Never auto-delete auth_state here — forcing a fresh QR pairing
        // looks like anomalous login activity on the account (docs/DEPLOY.md).
        logger.error("WhatsApp session logged out — scan /qr again to re-pair");
        return;
      }

      setTimeout(() => {
        initWhatsApp(logger).catch((err) => logger.error({ err }, "WhatsApp reconnect failed"));
      }, RECONNECT_DELAY_MS);
    }
  });

  sock.ev.on("messages.upsert", (payload) => {
    handleIncomingMessages(sock!, payload, logger).catch((err) =>
      logger.error({ err }, "unhandled error in messages.upsert handler"),
    );
  });

  sock.ev.on("lid-mapping.update", (mapping) => {
    handleLidMappingUpdate(mapping, logger).catch((err) =>
      logger.error({ err }, "unhandled error in lid-mapping.update handler"),
    );
  });
}

export interface SendTextResult {
  waMessageId: string;
  sentAt: Date;
}

export async function sendText(phoneNormalized: string, body: string): Promise<SendTextResult> {
  if (!sock || !connected) {
    throw new Error("WhatsApp is not connected");
  }
  const jid = phoneToJid(phoneNormalized);
  const result = await sock.sendMessage(jid, { text: body });
  if (!result?.key?.id) {
    throw new Error("WhatsApp send failed — no message key returned");
  }
  return { waMessageId: result.key.id, sentAt: new Date() };
}
