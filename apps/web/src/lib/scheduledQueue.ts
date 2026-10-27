import { db } from "@/lib/db";

export interface PendingScheduledMessage {
  id: string;
  body: string;
  scheduledFor: string;
  status: string;
  reason: string | null;
  lastError: string | null;
}

/**
 * Messages still waiting for one phone number, shown inside that chat's
 * thread. Never throws: if scheduled_messages does not exist yet (code
 * deployed before its migration — the 2026-10-01 incident) the chat must
 * keep loading, just without the queue.
 */
export async function listPendingForPhone(phone: string | null | undefined): Promise<PendingScheduledMessage[]> {
  if (!phone) return [];
  try {
    const rows = await db.scheduledMessage.findMany({
      where: { phoneNormalized: phone, status: { in: ["queued", "sending", "failed"] } },
      orderBy: { scheduledFor: "asc" },
    });
    return rows
      // A failed row stays visible for 24h so a failure is never silent.
      .filter((r) => r.status !== "failed" || Date.now() - r.updatedAt.getTime() < 24 * 3600_000)
      .map((r) => ({
        id: r.id,
        body: r.body,
        scheduledFor: r.scheduledFor.toISOString(),
        status: r.status,
        reason: r.reason,
        lastError: r.lastError,
      }));
  } catch (err) {
    console.error("[scheduledQueue] could not read scheduled_messages:", err);
    return [];
  }
}
