import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface Stat {
  lead_id: string;
  n_in: number;
  n_out: number;
  last_in: Date | null;
  last_out: Date | null;
}
interface LastBody {
  lead_id: string;
  body: string | null;
  message_type: string | null;
}
interface PitchRow {
  lead_id: string;
  last_pitch: Date;
  replies_after: number;
}

type Priority = "hot" | "positive" | "warm" | "try" | "closed";
const ORDER: Record<Priority, number> = { hot: 0, positive: 1, warm: 2, try: 3, closed: 4 };
const wibDate = (d = new Date()) => d.toLocaleDateString("sv", { timeZone: "Asia/Jakarta" });

/**
 * Work-list for /reports/followup.
 *  - scope=date&date=YYYY-MM-DD : leads whose very first WhatsApp message happened that WIB day
 *    ("yang saya approach hari itu"), default yesterday.
 *  - scope=waiting              : every lead with an open (or due-again snoozed) triage row.
 * Priority comes from followup_triage (written by a Claude session / edited on the page); when a lead
 * has no triage row yet it falls back to an automatic guess: no reply after the pitch → "try", else "warm".
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const scope = sp.get("scope") === "waiting" ? "waiting" : "date";
  const today = wibDate();
  const yesterday = wibDate(new Date(Date.now() - 86400000));
  const rawDate = sp.get("date") ?? "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : yesterday;

  let ids: string[];
  if (scope === "waiting") {
    const rows = await db.followupTriage.findMany({
      where: { OR: [{ status: "open" }, { status: "snoozed", snoozeUntil: { lte: today } }] },
      select: { leadId: true },
    });
    ids = rows.map((r) => r.leadId);
  } else {
    const rows = await db.$queryRaw<{ lead_id: string }[]>`
      SELECT c.lead_id
        FROM wa_messages m JOIN wa_contacts c ON c.id = m.wa_contact_id
       GROUP BY c.lead_id
      HAVING ((min(m.sent_at) AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta')::date = ${date}::date`;
    ids = rows.map((r) => r.lead_id);
  }
  if (ids.length === 0) return NextResponse.json({ scope, date, today, total: 0, items: [] });

  const [leads, triage, stats, lastIn, lastOut, pitches, summaries, appts] = await Promise.all([
    db.lead.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, phoneNormalized: true } }),
    db.followupTriage.findMany({ where: { leadId: { in: ids } } }),
    db.$queryRaw<Stat[]>`
      SELECT c.lead_id,
             count(*) FILTER (WHERE m.direction = 'inbound')::int  AS n_in,
             count(*) FILTER (WHERE m.direction = 'outbound')::int AS n_out,
             max(m.sent_at) FILTER (WHERE m.direction = 'inbound')  AS last_in,
             max(m.sent_at) FILTER (WHERE m.direction = 'outbound') AS last_out
        FROM wa_messages m JOIN wa_contacts c ON c.id = m.wa_contact_id
       WHERE c.lead_id = ANY(${ids}::uuid[])
       GROUP BY c.lead_id`,
    db.$queryRaw<LastBody[]>`
      SELECT DISTINCT ON (c.lead_id) c.lead_id, left(m.body, 220) AS body, m.message_type
        FROM wa_messages m JOIN wa_contacts c ON c.id = m.wa_contact_id
       WHERE c.lead_id = ANY(${ids}::uuid[]) AND m.direction = 'inbound'
       ORDER BY c.lead_id, m.sent_at DESC`,
    db.$queryRaw<LastBody[]>`
      SELECT DISTINCT ON (c.lead_id) c.lead_id, left(m.body, 220) AS body, m.message_type
        FROM wa_messages m JOIN wa_contacts c ON c.id = m.wa_contact_id
       WHERE c.lead_id = ANY(${ids}::uuid[]) AND m.direction = 'outbound'
       ORDER BY c.lead_id, m.sent_at DESC`,
    db.$queryRaw<PitchRow[]>`
      SELECT c.lead_id,
             max(m.sent_at) AS last_pitch,
             (SELECT count(*)::int FROM wa_messages i JOIN wa_contacts ic ON ic.id = i.wa_contact_id
               WHERE ic.lead_id = c.lead_id AND i.direction = 'inbound' AND i.sent_at > max(m.sent_at)) AS replies_after
        FROM wa_messages m JOIN wa_contacts c ON c.id = m.wa_contact_id
       WHERE c.lead_id = ANY(${ids}::uuid[]) AND m.direction = 'outbound'
         AND m.body ILIKE '%perkenalkan saya dzaki wismadi%'
       GROUP BY c.lead_id`,
    db.syncDailySummary.findMany({
      where: { leadId: { in: ids } },
      orderBy: { date: "desc" },
      select: { leadId: true, date: true, summary: true },
    }),
    db.leadAppointment.findMany({
      where: { leadId: { in: ids }, status: { not: "cancelled" } },
      orderBy: { startsAt: "asc" },
      select: { id: true, leadId: true, kind: true, startsAt: true, status: true, location: true, note: true },
    }),
  ]);

  const triageBy = new Map(triage.map((t) => [t.leadId, t]));
  const apptBy = new Map<string, typeof appts>();
  for (const a of appts) apptBy.set(a.leadId, [...(apptBy.get(a.leadId) ?? []), a]);
  const statBy = new Map(stats.map((s) => [s.lead_id, s]));
  const inBy = new Map(lastIn.map((s) => [s.lead_id, s]));
  const outBy = new Map(lastOut.map((s) => [s.lead_id, s]));
  const pitchBy = new Map(pitches.map((p) => [p.lead_id, p]));
  const sumBy = new Map<string, { date: string; summary: string }>();
  for (const s of summaries) if (!sumBy.has(s.leadId)) sumBy.set(s.leadId, { date: s.date, summary: s.summary });
  // wa_messages.sent_at is a timestamp WITHOUT zone that holds UTC.
  const iso = (d: Date | null | undefined) => (d ? new Date(d.getTime()).toISOString() : null);
  const bodyOf = (r: LastBody | undefined) => (r ? (r.body && r.body.trim() ? r.body : `[${r.message_type ?? "media"}]`) : null);

  const items = leads.map((l) => {
    const s = statBy.get(l.id);
    const pitch = pitchBy.get(l.id);
    const t = triageBy.get(l.id);
    const repliesAfterPitch = pitch ? pitch.replies_after : (s?.n_in ?? 0);
    const auto: Priority = repliesAfterPitch > 0 ? "warm" : "try";
    const lastInAt = iso(s?.last_in);
    const lastOutAt = iso(s?.last_out);
    return {
      id: l.id,
      name: l.name,
      phone: l.phoneNormalized,
      nIn: s?.n_in ?? 0,
      nOut: s?.n_out ?? 0,
      lastInAt,
      lastOutAt,
      lastAt: [lastInAt, lastOutAt].filter(Boolean).sort().pop() ?? null,
      lastInBody: bodyOf(inBy.get(l.id)),
      lastOutBody: bodyOf(outBy.get(l.id)),
      pitchAt: pitch ? pitch.last_pitch.toISOString() : null,
      repliesAfterPitch,
      weTheLast: !!lastOutAt && (!lastInAt || lastOutAt > lastInAt),
      summary: sumBy.get(l.id) ?? null,
      priority: (t?.priority as Priority | undefined) ?? auto,
      isAuto: !t,
      action: t?.action ?? null,
      notes: Array.isArray(t?.notes) ? (t.notes as unknown[]) : [],
      importantSection: t?.importantSection ?? null,
      appointments: (apptBy.get(l.id) ?? []).map((a) => ({ ...a, startsAt: a.startsAt.toISOString() })),
      dueDate: t?.dueDate ?? null,
      status: t?.status ?? "open",
      snoozeUntil: t?.snoozeUntil ?? null,
      source: t?.source ?? "auto",
    };
  });

  items.sort(
    (a, b) =>
      (ORDER[a.priority] ?? 9) - (ORDER[b.priority] ?? 9) ||
      (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9") ||
      (b.lastAt ?? "").localeCompare(a.lastAt ?? ""),
  );
  return NextResponse.json({ scope, date, today, total: items.length, items });
}
