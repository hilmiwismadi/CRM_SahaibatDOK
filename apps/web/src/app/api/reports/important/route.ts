import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface Stat {
  lead_id: string;
  last_in: Date | null;
  last_out: Date | null;
}
interface LastBody {
  lead_id: string;
  body: string | null;
  message_type: string | null;
}

// A demo is either an online Gmeet or an in-person visit.
const DEMO_KINDS = ["demo_gmeet", "visit"];

/**
 * Data for /reports/important.
 *  - main        : followup_triage.important_section = 'main' (demoed leads that are being nurtured).
 *  - postGmeet   : important_section = 'post_gmeet' PLUS every lead that already had a (non-cancelled,
 *                  past) Gmeet or visit appointment but is not in "main" — so a demo that went nowhere is never
 *                  forgotten; `reason` holds why there is no follow-up (typed by the rep).
 *  - noteLog     : per lead, newest first (max 30) — when each reminder point was added/checked/edited/deleted.
 *  - upcoming    : scheduled appointments from now on (any lead), to remind about the next meetings.
 */
export async function GET() {
  const now = new Date();
  const [marked, pastGmeet, upcomingRows] = await Promise.all([
    db.followupTriage.findMany({ where: { importantSection: { not: null } } }),
    db.leadAppointment.findMany({
      where: { kind: { in: DEMO_KINDS }, status: { not: "cancelled" }, startsAt: { lte: now } },
      select: { leadId: true },
      distinct: ["leadId"],
    }),
    db.leadAppointment.findMany({
      where: { status: "scheduled", startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 30,
      select: { id: true, leadId: true, kind: true, startsAt: true, location: true, lead: { select: { name: true } } },
    }),
  ]);

  const ids = [...new Set([...marked.map((m) => m.leadId), ...pastGmeet.map((a) => a.leadId)])];
  if (ids.length === 0) {
    return NextResponse.json({
      main: [],
      postGmeet: [],
      upcoming: upcomingRows.map((a) => ({ id: a.id, leadId: a.leadId, name: a.lead.name, kind: a.kind, startsAt: a.startsAt.toISOString(), location: a.location })),
    });
  }

  const [leads, triage, appts, stats, lastIn, lastOut, summaries, noteLogs] = await Promise.all([
    db.lead.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, phoneNormalized: true } }),
    db.followupTriage.findMany({ where: { leadId: { in: ids } } }),
    db.leadAppointment.findMany({
      where: { leadId: { in: ids }, status: { not: "cancelled" } },
      orderBy: { startsAt: "asc" },
      select: { id: true, leadId: true, kind: true, startsAt: true, status: true, location: true, note: true },
    }),
    db.$queryRaw<Stat[]>`
      SELECT c.lead_id,
             max(m.sent_at) FILTER (WHERE m.direction = 'inbound')  AS last_in,
             max(m.sent_at) FILTER (WHERE m.direction = 'outbound') AS last_out
        FROM wa_messages m JOIN wa_contacts c ON c.id = m.wa_contact_id
       WHERE c.lead_id = ANY(${ids}::uuid[])
       GROUP BY c.lead_id`,
    db.$queryRaw<LastBody[]>`
      SELECT DISTINCT ON (c.lead_id) c.lead_id, left(m.body, 200) AS body, m.message_type
        FROM wa_messages m JOIN wa_contacts c ON c.id = m.wa_contact_id
       WHERE c.lead_id = ANY(${ids}::uuid[]) AND m.direction = 'inbound'
       ORDER BY c.lead_id, m.sent_at DESC`,
    db.$queryRaw<LastBody[]>`
      SELECT DISTINCT ON (c.lead_id) c.lead_id, left(m.body, 200) AS body, m.message_type
        FROM wa_messages m JOIN wa_contacts c ON c.id = m.wa_contact_id
       WHERE c.lead_id = ANY(${ids}::uuid[]) AND m.direction = 'outbound'
       ORDER BY c.lead_id, m.sent_at DESC`,
    db.syncDailySummary.findMany({
      where: { leadId: { in: ids } },
      orderBy: { date: "desc" },
      select: { leadId: true, date: true, summary: true },
    }),
    db.followupNoteLog.findMany({
      where: { leadId: { in: ids } },
      orderBy: { at: "desc" },
      select: { id: true, leadId: true, noteId: true, action: true, text: true, at: true },
    }),
  ]);

  const triageBy = new Map(triage.map((t) => [t.leadId, t]));
  const statBy = new Map(stats.map((s) => [s.lead_id, s]));
  const inBy = new Map(lastIn.map((s) => [s.lead_id, s]));
  const outBy = new Map(lastOut.map((s) => [s.lead_id, s]));
  const apptBy = new Map<string, typeof appts>();
  for (const a of appts) apptBy.set(a.leadId, [...(apptBy.get(a.leadId) ?? []), a]);
  const logBy = new Map<string, { id: string; noteId: string; action: string; text: string; at: string }[]>();
  for (const g of noteLogs) {
    const list = logBy.get(g.leadId) ?? [];
    if (list.length < 30) list.push({ id: g.id, noteId: g.noteId, action: g.action, text: g.text, at: g.at.toISOString() });
    logBy.set(g.leadId, list);
  }
  const sumBy = new Map<string, { date: string; summary: string }>();
  for (const s of summaries) if (!sumBy.has(s.leadId)) sumBy.set(s.leadId, { date: s.date, summary: s.summary });
  // wa_messages.sent_at is a timestamp WITHOUT zone that holds UTC.
  const iso = (d: Date | null | undefined) => (d ? new Date(d.getTime()).toISOString() : null);
  const bodyOf = (r: LastBody | undefined) => (r ? (r.body && r.body.trim() ? r.body : `[${r.message_type ?? "media"}]`) : null);

  const items = leads.map((l) => {
    const t = triageBy.get(l.id);
    const s = statBy.get(l.id);
    const lastInAt = iso(s?.last_in);
    const lastOutAt = iso(s?.last_out);
    const section = (t?.importantSection as "main" | "post_gmeet" | null) ?? "post_gmeet";
    return {
      id: l.id,
      name: l.name,
      phone: l.phoneNormalized,
      section,
      isAutoPost: !t?.importantSection,
      stage: t?.importantStage ?? null,
      status: t?.importantStatus ?? null,
      reason: t?.noFollowReason ?? null,
      priority: t?.priority ?? null,
      notes: Array.isArray(t?.notes) ? (t.notes as unknown[]) : [],
      noteLog: logBy.get(l.id) ?? [],
      appointments: (apptBy.get(l.id) ?? []).map((a) => ({ ...a, startsAt: a.startsAt.toISOString() })),
      lastInAt,
      lastOutAt,
      lastAt: [lastInAt, lastOutAt].filter(Boolean).sort().pop() ?? null,
      weTheLast: !!lastOutAt && (!lastInAt || lastOutAt > lastInAt),
      lastInBody: bodyOf(inBy.get(l.id)),
      lastOutBody: bodyOf(outBy.get(l.id)),
      summary: sumBy.get(l.id) ?? null,
    };
  });

  // Quietest first: the lead we have not talked to for longest is the one most likely forgotten.
  items.sort((a, b) => (a.lastAt ?? "").localeCompare(b.lastAt ?? ""));
  return NextResponse.json({
    main: items.filter((i) => i.section === "main"),
    postGmeet: items.filter((i) => i.section === "post_gmeet"),
    upcoming: upcomingRows.map((a) => ({ id: a.id, leadId: a.leadId, name: a.lead.name, kind: a.kind, startsAt: a.startsAt.toISOString(), location: a.location })),
  });
}
