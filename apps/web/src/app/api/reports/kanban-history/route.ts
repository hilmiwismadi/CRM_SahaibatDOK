import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Per-day counts AND per-day lead lists per Kanban category (see
 * apps/web/src/lib/leadSegmentation.ts for the category set) — backs
 * /reports/kanban's "Per Tanggal"/"Per Minggu" views. Deliberately
 * event-counts ("N leads newly flagged noWaAccount on this day"), not a
 * historical state reconstruction ("what the full snapshot looked like as
 * of that day") — much simpler, and matches what a rep actually wants
 * ("what happened today"). See Context/SahaibatExplanation/6.ReportsDashboardPlan.md
 * and the conversation that led to this file for the full reasoning.
 *
 * Returns the actual leads per category per day (not just a count) —
 * modeled after CRM_Grad's SalesReport.tsx, whose per-period Kanban columns
 * list the leads themselves under each colored category header, not a bare
 * number. A lead is deduped to at most once per (day, category) even if
 * multiple events fired that day (e.g. a tag toggled on/off/on again).
 *
 * 3 of the 9 categories were already fully timestamped (no logging
 * change needed): stage_change activities (untouched->touched),
 * wa_messages.sent_at (needs_reply), replied_override_at (superseded here
 * by the newer replied_marked activity log for full history — see
 * apps/web/src/app/api/conversations/[id]/replied/route.ts). The other 6
 * (noWaAccount/appointment/declined/needsOtherContact/needsFollowUp/letterSent)
 * only have history from whenever tag_change logging was added (see
 * apps/web/src/app/api/conversations/[id]/flag/route.ts) — earlier days
 * will show 0 for those even if the flag was already true, because no
 * event was ever recorded for it.
 */

const TAG_KEYS = [
  "noWaAccount",
  "appointment",
  "declined",
  "needsOtherContact",
  "needsFollowUp",
  "letterSent",
] as const;

type CategoryKey =
  | "untouchedToTouched"
  | "needsReply"
  | "repliedByBot"
  | "noWaAccount"
  | "appointment"
  | "declined"
  | "needsOtherContact"
  | "needsFollowUp"
  | "letterSent";

const CATEGORY_KEYS: CategoryKey[] = [
  "untouchedToTouched",
  "needsReply",
  "repliedByBot",
  "noWaAccount",
  "appointment",
  "declined",
  "needsOtherContact",
  "needsFollowUp",
  "letterSent",
];

interface DayEntry {
  date: string;
  counts: Record<CategoryKey, number>;
  leads: Record<CategoryKey, { id: string; name: string }[]>;
}

function emptyCategoryRecord<T>(fill: () => T): Record<CategoryKey, T> {
  const rec = {} as Record<CategoryKey, T>;
  for (const k of CATEGORY_KEYS) rec[k] = fill();
  return rec;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(Number(searchParams.get("days")) || 30, 1), 90);

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);

  // (date, category) -> Set<leadId>, deduped as events are folded in.
  const byDate = new Map<string, Record<CategoryKey, Set<string>>>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDate.set(key, emptyCategoryRecord(() => new Set<string>()));
  }
  const bump = (d: Date, category: CategoryKey, leadId: string | null | undefined) => {
    if (!leadId) return;
    const entry = byDate.get(d.toISOString().slice(0, 10));
    if (entry) entry[category].add(leadId);
  };

  const [stageChanges, inboundMessages, activities] = await Promise.all([
    db.leadActivity.findMany({
      where: { type: "stage_change", createdAt: { gte: since } },
      select: { createdAt: true, payload: true, leadId: true },
    }),
    db.waMessage.findMany({
      where: { direction: "inbound", sentAt: { gte: since } },
      select: { sentAt: true, waContact: { select: { leadId: true } } },
    }),
    db.leadActivity.findMany({
      where: { type: { in: ["tag_change", "replied_marked"] }, createdAt: { gte: since } },
      select: { createdAt: true, type: true, payload: true, leadId: true },
    }),
  ]);

  for (const sc of stageChanges) {
    const payload = sc.payload as { from?: string } | null;
    if (payload?.from === "new") bump(sc.createdAt, "untouchedToTouched", sc.leadId);
  }

  // "Belum Dijawab" per day: distinct leads who had an inbound message that
  // day (a reply that needed a response) — a proxy, not "still unanswered
  // as of now", consistent with the event-count framing above.
  for (const m of inboundMessages) {
    bump(m.sentAt, "needsReply", m.waContact?.leadId);
  }

  for (const a of activities) {
    const payload = a.payload as { tag?: string; value?: boolean; kind?: string } | null;
    if (a.type === "replied_marked" && payload?.kind === "bot") {
      bump(a.createdAt, "repliedByBot", a.leadId);
    } else if (a.type === "tag_change" && payload?.value === true) {
      const tag = payload.tag;
      if (tag && (TAG_KEYS as readonly string[]).includes(tag)) {
        bump(a.createdAt, tag as (typeof TAG_KEYS)[number], a.leadId);
      }
    }
  }

  // Resolve names for every lead referenced anywhere in the window in one
  // query, then materialize the per-day Sets into sorted {id, name} lists.
  const allLeadIds = new Set<string>();
  for (const rec of byDate.values()) {
    for (const key of CATEGORY_KEYS) for (const id of rec[key]) allLeadIds.add(id);
  }
  const leadNames = new Map<string, string>();
  if (allLeadIds.size > 0) {
    const leads = await db.lead.findMany({
      where: { id: { in: [...allLeadIds] } },
      select: { id: true, name: true },
    });
    for (const l of leads) leadNames.set(l.id, l.name);
  }

  const series: DayEntry[] = Array.from(byDate.entries()).map(([date, rec]) => {
    const counts = {} as Record<CategoryKey, number>;
    const leads = {} as Record<CategoryKey, { id: string; name: string }[]>;
    for (const key of CATEGORY_KEYS) {
      const ids = [...rec[key]];
      counts[key] = ids.length;
      leads[key] = ids
        .map((id) => ({ id, name: leadNames.get(id) ?? "Unknown" }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return { date, counts, leads };
  });

  return NextResponse.json({ series });
}
