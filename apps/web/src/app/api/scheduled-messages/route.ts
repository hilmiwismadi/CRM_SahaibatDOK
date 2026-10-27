import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Global send queue (backs /queue). ?status=queued|sending|failed|sent|cancelled — default: everything still open. */
export async function GET(req: NextRequest) {
  const status = new URL(req.url).searchParams.get("status");
  const rows = await db.scheduledMessage.findMany({
    where: status ? { status } : { status: { in: ["queued", "sending", "failed"] } },
    orderBy: { scheduledFor: "asc" },
    take: 500,
  });

  const leadIds = [...new Set(rows.map((r) => r.leadId).filter((x): x is string => Boolean(x)))];
  const leads = leadIds.length
    ? await db.lead.findMany({ where: { id: { in: leadIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(leads.map((l) => [l.id, l.name]));

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      phone: r.phoneNormalized,
      leadId: r.leadId,
      leadName: r.leadId ? (nameById.get(r.leadId) ?? null) : null,
      body: r.body,
      scheduledFor: r.scheduledFor.toISOString(),
      status: r.status,
      reason: r.reason,
      lastError: r.lastError,
      attempts: r.attempts,
    })),
  });
}
