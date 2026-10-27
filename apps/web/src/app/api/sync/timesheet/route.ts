import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { todayWib, wibDayRange } from "@/lib/syncDateRange";
import { planWeek, weekTarget, type DayDemo, type DayStats } from "@/lib/timesheetPlan";

/**
 * Backs /sync/timesheet — a weekly DRAFT for sales.sahaibat.com/timesheet.
 * Aggregates the week's wa_messages per WIB day and turns that into
 * approximate timesheet rows via planWeek(). Read-only: nothing here writes
 * to this DB or to sales.sahaibat.com — the page turns the (hand-edited)
 * table into a console script the rep runs there themselves, same pattern
 * as /sync/dailylog.
 *
 * Everything the timesheet notes say is derived from the same per-lead data
 * returned here (`days[].leads`), so the numbers can be audited lead by lead.
 * Demos come from lead_appointments (not keyword guesses): a meeting counts
 * when it is `done`, or `scheduled` with a start time already in the past.
 *
 * The rep can also add meetings by hand on the page (ones never recorded in
 * Jadwal); they arrive as `demos` and count exactly like a done appointment,
 * unless Jadwal already has a meeting with that lead on that day.
 *
 * Query: week=<any YYYY-MM-DD in the week> (snapped to Monday),
 *        skip=<comma-separated dates to leave empty>,
 *        extra=<extra Admin work description>, target=<hours, optional>,
 *        demos=<JSON [{date,time,leadName,kind,durationMin}], optional>.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const PITCH_RE = /^\s*Perkenalkan saya/i;
const CONFIRM_RE = /apakah benar ini kontak/i;
// Scheduling talk outside the standard pitch (which itself mentions "minggu depan").
const SCHEDULE_RE = /g\s?-?meet|google meet|zoom|wawancara|jadwal|minggu depan|senin|selasa|rabu|kamis|jumat|sabtu|pukul|jam \d/i;
const SNIPPET_LEN = 160;

function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const dow = d.getUTCDay() || 7; // Sunday = 7
  return new Date(d.getTime() - (dow - 1) * DAY_MS).toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  return new Date(new Date(`${dateStr}T00:00:00Z`).getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

function wibDate(d: Date): string {
  return new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function wibTime(d: Date): string {
  return new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

function snippet(body: string): string {
  const t = body.replace(/\s+/g, " ").trim();
  return t.length > SNIPPET_LEN ? t.slice(0, SNIPPET_LEN) + "…" : t;
}

interface ManualDemo {
  date: string;
  time: string;
  leadName: string;
  kind: string;
  durationMin: number;
}

const KINDS = ["demo_gmeet", "visit", "other"];

function parseManualDemos(raw: string | null, weekStart: string, weekEnd: string): ManualDemo[] {
  if (!raw) return [];
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  return list.flatMap((x) => {
    const date = String(x?.date ?? "");
    const time = String(x?.time ?? "");
    const leadName = String(x?.leadName ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < weekStart || date > weekEnd) return [];
    if (!/^\d{2}:\d{2}$/.test(time) || !leadName) return [];
    const durationMin = Number(x?.durationMin);
    return [
      {
        date,
        time,
        leadName,
        kind: KINDS.includes(x?.kind) ? x.kind : "demo_gmeet",
        durationMin: Number.isFinite(durationMin) && durationMin > 0 ? durationMin : 60,
      },
    ];
  });
}

export interface LeadDetail {
  leadId: string;
  name: string;
  isNew: boolean; // very first message with this lead (any of its contacts) was that day (cold chat)
  sent: ("konfirmasi" | "pitch" | "lainnya")[];
  outbound: number;
  inbound: number;
  replied: boolean;
  replies: string[]; // first inbound texts that day
  schedule: string[]; // scheduling/Gmeet snippets, prefixed "Saya:" / "Lead:"
  summary: string | null; // Claude's hand-written read of that day (sync_daily_summaries), null = not written yet
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const weekStart = mondayOf(searchParams.get("week") || todayWib());
  const weekEnd = addDays(weekStart, 6);
  const skip = new Set((searchParams.get("skip") || "").split(",").map((s) => s.trim()).filter(Boolean));
  const extra = searchParams.get("extra") || "";
  const targetParam = Number(searchParams.get("target"));
  const target = Number.isFinite(targetParam) && targetParam > 0 ? targetParam : weekTarget(weekStart);

  const { start } = wibDayRange(weekStart);
  const { end } = wibDayRange(weekEnd);
  const now = new Date();

  const [messages, appointments, summaryRows] = await Promise.all([
    db.waMessage.findMany({
      where: { sentAt: { gte: start, lte: end }, waContact: { leadId: { not: null } } },
      orderBy: { sentAt: "asc" },
      select: {
        direction: true,
        body: true,
        sentAt: true,
        waContactId: true,
        waContact: { select: { leadId: true, lead: { select: { name: true } } } },
      },
    }),
    db.leadAppointment.findMany({
      where: { startsAt: { gte: start, lte: end }, status: { not: "cancelled" } },
      orderBy: { startsAt: "asc" },
      select: { kind: true, startsAt: true, durationMin: true, status: true, location: true, lead: { select: { name: true } } },
    }),
    // Same hand-written "Ringkasan Claude" rows /sync/dailylog shows; the timesheet Notes quote them.
    db.syncDailySummary.findMany({
      where: { date: { gte: weekStart, lte: weekEnd } },
      select: { leadId: true, date: true, summary: true },
    }),
  ]);
  const summaryOf = new Map(summaryRows.map((r) => [r.date + "|" + r.leadId, r.summary]));

  // First-ever message per LEAD (over all its WA contacts) → "new lead that day"
  // (cold chat) vs follow-up. Per contact was wrong: reaching a lead's second
  // number (admin, HRD) made an old lead count as new again.
  const leadIds = [...new Set(messages.map((m) => m.waContact?.leadId).filter((x): x is string => !!x))];
  const contacts = leadIds.length
    ? await db.waContact.findMany({ where: { leadId: { in: leadIds } }, select: { id: true, leadId: true } })
    : [];
  const firsts = contacts.length
    ? await db.waMessage.groupBy({ by: ["waContactId"], where: { waContactId: { in: contacts.map((c) => c.id) } }, _min: { sentAt: true } })
    : [];
  const leadOfContact = new Map(contacts.map((c) => [c.id, c.leadId]));
  const firstDate = new Map<string, string>(); // leadId → WIB date of its first message
  for (const f of firsts) {
    const leadId = leadOfContact.get(f.waContactId);
    if (!leadId || !f._min.sentAt) continue;
    const d = wibDate(f._min.sentAt);
    const prev = firstDate.get(leadId);
    if (!prev || d < prev) firstDate.set(leadId, d);
  }

  // Meetings: counted when done, or scheduled and already started.
  const jadwalMeetings = appointments.map((a) => {
    const counted = a.status === "done" || a.startsAt <= now;
    return {
      date: wibDate(a.startsAt),
      time: wibTime(a.startsAt),
      kind: a.kind,
      status: a.status,
      leadName: a.lead.name,
      durationMin: a.durationMin,
      location: a.location,
      counted,
    };
  });
  // Hand-added meetings, skipped when Jadwal already has one with that lead that day.
  const inJadwal = new Set(jadwalMeetings.map((m) => m.date + "|" + m.leadName.toLowerCase()));
  const manualMeetings = parseManualDemos(searchParams.get("demos"), weekStart, weekEnd)
    .filter((d) => !inJadwal.has(d.date + "|" + d.leadName.toLowerCase()))
    .map((d) => ({ ...d, status: "manual", location: null, counted: true }));
  const meetings = [...jadwalMeetings, ...manualMeetings].sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time),
  );

  const weekLeads = new Set<string>();
  const weekReplied = new Set<string>();
  const weekNew = new Set<string>();

  const days: (DayStats & { leads: LeadDetail[] })[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const byLead = new Map<string, LeadDetail>();
    let confirm = 0;
    let pitch = 0;
    let outbound = 0;
    let inbound = 0;

    for (const m of messages) {
      if (wibDate(m.sentAt) !== date) continue;
      const leadId = m.waContact?.leadId;
      if (!leadId) continue;
      let d = byLead.get(leadId);
      if (!d) {
        d = {
          leadId,
          name: m.waContact?.lead?.name ?? "(tanpa nama)",
          isNew: firstDate.get(leadId) === date,
          sent: [],
          outbound: 0,
          inbound: 0,
          replied: false,
          replies: [],
          schedule: [],
          summary: summaryOf.get(date + "|" + leadId) ?? null,
        };
        byLead.set(leadId, d);
      }
      const body = m.body ?? "";
      if (m.direction === "outbound") {
        outbound++;
        d.outbound++;
        if (PITCH_RE.test(body)) {
          pitch++;
          if (!d.sent.includes("pitch")) d.sent.push("pitch");
        } else if (CONFIRM_RE.test(body)) {
          confirm++;
          if (!d.sent.includes("konfirmasi")) d.sent.push("konfirmasi");
        } else {
          if (!d.sent.includes("lainnya")) d.sent.push("lainnya");
          if (SCHEDULE_RE.test(body) && d.schedule.length < 3) d.schedule.push("Saya: " + snippet(body));
        }
      } else if (body.trim()) {
        inbound++;
        d.inbound++;
        d.replied = true;
        if (d.replies.length < 3) d.replies.push(snippet(body));
        // Long inbound texts are usually bot auto-replies listing practice hours — not scheduling talk.
        if (body.length <= 200 && SCHEDULE_RE.test(body) && d.schedule.length < 3) d.schedule.push("Lead: " + snippet(body));
      }
    }

    const leads = [...byLead.values()].sort((a, b) => a.name.localeCompare(b.name));
    for (const l of leads) {
      weekLeads.add(l.leadId);
      if (l.replied) weekReplied.add(l.leadId);
      if (l.isNew) weekNew.add(l.leadId);
    }

    const dayDemos: DayDemo[] = meetings
      .filter((mt) => mt.date === date && mt.counted)
      .map((mt) => ({
        leadName: mt.leadName,
        kind: mt.kind,
        time: mt.time,
        hours: Math.max(0.5, Math.round(((mt.durationMin || 60) / 60) * 4) / 4),
      }));

    days.push({
      date,
      weekday: i + 1,
      leadsChatted: leads.length,
      newLeads: leads.filter((l) => l.isNew).length,
      confirm,
      pitch,
      repliedLeads: leads.filter((l) => l.replied).length,
      followUpLeads: leads.filter((l) => !l.isNew).length,
      scheduleLeads: leads.filter((l) => l.schedule.length > 0).length,
      outbound,
      inbound,
      demos: dayDemos,
      leads,
    });
  }

  const summary = {
    clients: weekLeads.size,
    replied: weekReplied.size,
    newLeads: weekNew.size,
    demos: meetings.filter((m) => m.counted).length,
  };

  const plan = planWeek({ weekStart, days, today: todayWib(), skip, extra, summary, target });
  return NextResponse.json({
    weekStart,
    weekEnd,
    today: todayWib(),
    target: plan.target,
    total: plan.total,
    summary,
    meetings,
    days,
    rows: plan.rows,
  });
}
