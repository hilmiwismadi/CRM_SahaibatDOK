import { db } from "@/lib/db";
import { planSend } from "@/lib/sendGuard";
import { sendOutboundToPhone, WaSendError } from "@/lib/waSend";

/**
 * Sends due rows of scheduled_messages. Started once per web process from
 * src/instrumentation.ts. Deliberately conservative:
 *  - at most ONE message per tick (the guard's minimum gap is > the tick);
 *  - a row is claimed atomically (FOR UPDATE SKIP LOCKED) so a second process
 *    could never double-send it;
 *  - right before sending, the guard is asked again using only what was really
 *    sent — if the rep sent something in the meantime, the row moves later
 *    instead of piling on;
 *  - a row stuck in "sending" (process died mid-send) is NOT retried — whether
 *    it was delivered is unknown, so it is marked failed for a human to check.
 */
const TICK_MS = 5_000; // short enough that a time set to the second is honoured within ~5s
const MAX_ATTEMPTS = 3;

let started = false;
let ticking = false;

export function startScheduledDispatcher(): void {
  if (started || process.env.SCHEDULED_DISPATCHER_DISABLED === "1") return;
  started = true;
  const timer = setInterval(() => {
    tick().catch((err) => console.error("[scheduledDispatcher] tick failed:", err));
  }, TICK_MS);
  timer.unref?.();
  console.log(`[scheduledDispatcher] started (every ${TICK_MS / 1000}s)`);
}

export async function tick(now: Date = new Date()): Promise<void> {
  if (ticking) return;
  ticking = true;
  try {
    await db.scheduledMessage.updateMany({
      where: { status: "sending", updatedAt: { lt: new Date(now.getTime() - 5 * 60_000) } },
      data: { status: "failed", lastError: "Proses berhenti saat mengirim — status terkirim tidak pasti. Cek chat sebelum mengirim ulang." },
    });

    const claimed = await db.$queryRaw<{ id: string }[]>`
      UPDATE scheduled_messages
         SET status = 'sending', attempts = attempts + 1, updated_at = ${now}
       WHERE id = (
         SELECT id FROM scheduled_messages
          WHERE status = 'queued' AND scheduled_for <= ${now}
          ORDER BY scheduled_for ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED)
      RETURNING id`;
    if (!claimed[0]) return;

    const row = await db.scheduledMessage.findUnique({ where: { id: claimed[0].id } });
    if (!row) return;

    const requeue = (at: Date, error: string | null, refund: boolean) =>
      db.scheduledMessage.update({
        where: { id: row.id },
        data: { status: "queued", scheduledFor: at, lastError: error, ...(refund ? { attempts: { decrement: 1 } } : {}) },
      });

    // Re-check against what has really been sent since this row was planned.
    const plan = await planSend({ phone: row.phoneNormalized, body: row.body, includeQueued: false, excludeId: row.id, now });
    if (!plan.immediate) {
      await requeue(plan.slot, `Digeser: ${plan.reasons.join(" • ")}`, true);
      return;
    }

    try {
      const { message } = await sendOutboundToPhone({ phoneNormalized: row.phoneNormalized, body: row.body, leadId: row.leadId });
      await db.scheduledMessage.update({
        where: { id: row.id },
        data: { status: "sent", sentAt: new Date(), sentMessageId: message.id, lastError: null },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (err instanceof WaSendError && err.status === 503) {
        // WhatsApp bridge offline / session logged out: not the message's fault, retry later without burning an attempt.
        await requeue(new Date(now.getTime() + 2 * 60_000), msg, true);
      } else if (err instanceof WaSendError && err.status === 422) {
        await db.scheduledMessage.update({ where: { id: row.id }, data: { status: "failed", lastError: msg } });
      } else if (row.attempts >= MAX_ATTEMPTS) {
        await db.scheduledMessage.update({ where: { id: row.id }, data: { status: "failed", lastError: msg } });
      } else {
        await requeue(new Date(now.getTime() + 5 * 60_000), msg, false);
      }
    }
  } finally {
    ticking = false;
  }
}
