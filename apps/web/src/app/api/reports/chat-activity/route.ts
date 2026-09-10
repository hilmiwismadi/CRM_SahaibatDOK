import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Daily outbound/inbound message counts for the last N days — backs
 * /reports' chat-activity chart. Fetches raw rows via plain Prisma (not
 * $queryRaw + SQL date_trunc) and buckets by day in JS using
 * toISOString().slice(0, 10), which is always UTC — sidesteps the
 * timestamp-parsing footgun documented elsewhere in this codebase (see
 * apps/wa-bridge/src/whatsapp/db-writer.ts's insertWaMessage doc comment)
 * rather than risk a raw SQL client interpreting `sent_at` in local time.
 * Message volume here is small (low hundreds), so fetching the range and
 * grouping client-side is simpler than it is a real cost.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(Number(searchParams.get("days")) || 30, 1), 90);

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);

  const messages = await db.waMessage.findMany({
    where: { sentAt: { gte: since } },
    select: { sentAt: true, direction: true, waContactId: true },
  });

  const byDate = new Map<string, { outbound: number; inbound: number; contactedIds: Set<string> }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    byDate.set(d.toISOString().slice(0, 10), { outbound: 0, inbound: 0, contactedIds: new Set() });
  }

  for (const m of messages) {
    const key = m.sentAt.toISOString().slice(0, 10);
    const entry = byDate.get(key);
    if (!entry) continue; // outside range due to a UTC/local boundary edge — safe to drop
    if (m.direction === "outbound") {
      entry.outbound++;
      // Distinct people actually reached that day — not the same as
      // message volume (one person can get several messages in a day).
      entry.contactedIds.add(m.waContactId);
    } else if (m.direction === "inbound") {
      entry.inbound++;
    }
  }

  const series = Array.from(byDate.entries()).map(([date, { outbound, inbound, contactedIds }]) => ({
    date,
    outbound,
    inbound,
    contactsReached: contactedIds.size,
  }));
  return NextResponse.json({ series });
}
