// Turns one week of WA chat activity + scheduled meetings into DRAFT timesheet
// rows for sales.sahaibat.com/timesheet (Day / Category / Account / Hours /
// Notes). Pure functions only (no db, no path aliases) so it can be unit-run
// with plain node.
//
// The rep's manager reads two numbers off this timesheet — how many clients
// were chatted that week and how many demos were done — so every number in a
// Note comes from the same DayStats the /sync/timesheet page lists lead by
// lead, and Demo rows come from real lead_appointments, never from keyword
// guesses. Chat-derived hours stay approximate (rep's call, 2026-10-11):
// ~40h/week, 38.5h min, 44h max.

export type TimesheetCategory = "prospecting" | "demo" | "follow_up" | "admin" | "travel" | "training";

/** A counted meeting (done, or scheduled and already past) from lead_appointments. */
export interface DayDemo {
  leadName: string;
  kind: string; // demo_gmeet | visit | other
  time: string; // HH:mm WIB
  hours: number;
}

/** One lead chatted on a day — what the Notes name so the manager can trace the numbers. */
export interface LeadNote {
  name: string;
  isNew: boolean;
  replied: boolean;
  replies: string[]; // raw inbound snippets (fallback when there is no summary)
  schedule: string[]; // non-empty = scheduling/Gmeet was discussed
  summary?: string | null; // Claude's hand-written read of that day (sync_daily_summaries)
}

export interface DayStats {
  date: string; // YYYY-MM-DD (WIB)
  weekday: number; // 1 = Monday ... 7 = Sunday
  leadsChatted: number; // leads with any message that day
  newLeads: number; // leads whose very first message was that day (cold chat)
  confirm: number; // "apakah benar ini kontak ..." messages sent
  pitch: number; // research pitch messages sent
  repliedLeads: number; // leads that sent a non-empty inbound message
  followUpLeads: number; // leads chatted that day that already had earlier chat history
  scheduleLeads: number; // leads where scheduling/Gmeet was discussed in chat (NOT a demo count)
  outbound: number;
  inbound: number;
  demos: DayDemo[];
  leads?: LeadNote[];
}

export interface WeekSummary {
  clients: number; // distinct leads chatted during the week
  replied: number; // distinct leads that replied
  newLeads: number;
  demos: number;
}

export interface PlanRow {
  date: string;
  category: TimesheetCategory;
  account: string; // "" = "— none —"
  hours: number;
  notes: string;
}

export const MIN_WEEK_HOURS = 38.5;
export const MAX_WEEK_HOURS = 44;

const STEP = 0.25;
const roundStep = (n: number) => Math.round(n / STEP) * STEP;

// Stable pseudo-random in [0,1) from a string, so regenerating the same week
// always gives the same draft (the rep edits the table, not a moving target).
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** ~40h with a little week-to-week variation, always inside 38.5–44. */
export function weekTarget(weekStart: string): number {
  const offsets = [-1.5, -1, -0.5, 0, 0, 0.5, 1, 1.5, 2, 3];
  const off = offsets[Math.floor(hash01("target" + weekStart) * offsets.length)];
  return Math.min(MAX_WEEK_HOURS, Math.max(MIN_WEEK_HOURS, 40 + off));
}

/** Days before this date are "light" days (3–5h); from here on a weekday is ~8h (rep's rule, 2026-10-12). */
export const FULL_DAYS_FROM = "2026-10-01";

export function demoNote(d: DayDemo): string {
  if (d.kind === "visit") return `Kunjungan/visit ke ${d.leadName} (pukul ${d.time} WIB).`;
  if (d.kind === "demo_gmeet") return `Demo via Gmeet dengan ${d.leadName} (pukul ${d.time} WIB).`;
  return `Pertemuan dengan ${d.leadName} (pukul ${d.time} WIB).`;
}

const MAX_NAMES = 60;

function names(ls: LeadNote[]): string {
  const n = ls.map((l) => l.name);
  return n.slice(0, MAX_NAMES).join(", ") + (n.length > MAX_NAMES ? `, dan ${n.length - MAX_NAMES} lainnya` : "");
}

/** One-line gist of a lead's reply: Claude's summary if written, else a short quote. */
function gist(l: LeadNote): string {
  const sum = (l.summary || "").replace(/\s+/g, " ").trim();
  if (sum) {
    const cut = sum.length > 150 ? sum.slice(0, 150).replace(/\s+\S*$/, "") + "…" : sum;
    return `${l.name} (${cut.replace(/\.$/, "")})`;
  }
  const q = (l.replies[0] || "").trim();
  return q ? `${l.name} (balas: "${q.length > 70 ? q.slice(0, 70) + "…" : q}")` : l.name;
}

function notesFor(cat: TimesheetCategory, s: DayStats, extra: string): string {
  const leads = s.leads ?? [];
  switch (cat) {
    case "prospecting": {
      const fresh = leads.filter((l) => l.isNew);
      const replied = fresh.filter((l) => l.replied);
      const parts: string[] = [];
      if (s.newLeads > 0) parts.push(`Cold chat ke ${s.newLeads} lead baru${fresh.length ? `: ${names(fresh)}` : ""}`);
      if (s.confirm > 0) parts.push(`konfirmasi nomor ${s.confirm} kontak`);
      if (s.pitch > 0) parts.push(`kirim pitch riset ke ${s.pitch} lead`);
      let t = parts.length ? parts.join(", ") : "Riset dan pencarian lead baru";
      if (leads.length ? replied.length > 0 : s.repliedLeads > 0) {
        t += `. ${replied.length} lead baru membalas${replied.length ? `: ${replied.map(gist).join("; ")}` : ""}`;
      }
      return t + ".";
    }
    case "follow_up": {
      const ups = leads.filter((l) => !l.isNew);
      const replied = ups.filter((l) => l.replied);
      const sched = ups.filter((l) => l.schedule.length > 0);
      let t = `Follow-up ${s.followUpLeads} lead${ups.length ? `: ${names(ups)}` : ""}`;
      if (replied.length > 0) t += `. ${replied.length} lead membalas: ${replied.map(gist).join("; ")}`;
      else if (!ups.length && s.repliedLeads > 0) t += `, ${s.repliedLeads} lead membalas`;
      if (sched.length > 0) t += `. Membahas jadwal wawancara/Gmeet dengan ${sched.length} lead: ${names(sched)}`;
      return t + ".";
    }
    case "admin": {
      let t = "Update CRM, daily log, dan timesheet";
      if (extra.trim()) t += `; ${extra.trim()}`;
      return t + ".";
    }
    default:
      return "";
  }
}

export interface PlanInput {
  weekStart: string;
  days: DayStats[]; // all 7 days, Monday first
  today: string; // WIB today — days after this are never filled
  skip: Set<string>; // dates the rep wants left empty
  extra: string; // extra Admin work description ("" = none)
  summary?: WeekSummary; // appended to the last day's Admin note
  target?: number;
}

export interface PlanResult {
  target: number;
  total: number;
  rows: PlanRow[];
}

function isAdminOnly(d: DayStats, hasExtra: boolean): boolean {
  return d.weekday > 5 && hasExtra && d.outbound === 0 && d.demos.length === 0;
}

export function planWeek(input: PlanInput): PlanResult {
  const target = input.target ?? weekTarget(input.weekStart);
  const hasExtra = input.extra.trim().length > 0;

  const included = input.days.filter((d) => {
    if (input.skip.has(d.date) || d.date > input.today) return false;
    return d.weekday <= 5 || d.outbound + d.inbound > 0 || d.demos.length > 0; // weekends only when there was work
  });

  // Weekend days stay small (minimal, per the rep): 1h + a little per chat volume, max 2.5h.
  const dayHours = new Map<string, number>();
  let weekendTotal = 0;
  for (const d of included.filter((x) => x.weekday > 5)) {
    const demoH = d.demos.reduce((s, x) => s + x.hours, 0);
    // A weekend day with no outgoing chat but extra Admin work (e.g. CRM tool updates) is an Admin-only day.
    const h = isAdminOnly(d, hasExtra) ? 2 : Math.max(demoH + 0.5, Math.min(2.5, roundStep(1 + d.outbound / 40)));
    dayHours.set(d.date, h);
    weekendTotal += h;
  }

  // Weekdays share the rest of the target, nudged by how busy the day was.
  const weekdays = included.filter((d) => d.weekday <= 5);
  const fullBase = Math.max(0, target - weekendTotal) / 5;
  const maxOut = Math.max(1, ...weekdays.map((d) => d.outbound));
  for (const d of weekdays) {
    const busy = Math.min(1, d.outbound / maxOut);
    const demoH = d.demos.reduce((s, x) => s + x.hours, 0);
    if (d.date < FULL_DAYS_FROM) {
      // Light days: 3–5h, a bit more when the chat was busy.
      const h = roundStep(3 + hash01("light" + d.date) * 1.2 + busy * 0.8);
      dayHours.set(d.date, Math.max(3, demoH + 2, Math.min(5, h)));
    } else {
      const jitter = (hash01("day" + d.date) - 0.5) * 0.4; // ±0.2h
      dayHours.set(d.date, Math.max(4, demoH + 3, roundStep(fullBase * (0.9 + 0.2 * busy) + jitter)));
    }
  }

  const rows: PlanRow[] = [];
  for (const d of included) {
    const H = dayHours.get(d.date) ?? 0;
    if (H <= 0) continue;
    const weekend = d.weekday > 5;

    // One Demo row per real meeting (this is what the manager counts).
    const demoH = d.demos.reduce((s, x) => s + x.hours, 0);
    for (const dm of d.demos) {
      rows.push({ date: d.date, category: "demo", account: dm.leadName, hours: dm.hours, notes: demoNote(dm) });
    }

    if (isAdminOnly(d, hasExtra)) {
      rows.push({
        date: d.date,
        category: "admin",
        account: "",
        hours: H,
        notes: `Kegiatan administratif (rekap data, daily log, timesheet); ${input.extra.trim()}.`,
      });
      continue;
    }

    let admin = weekend ? 0 : roundStep(Math.min(1.5, H * 0.2));
    if (!weekend && hasExtra) admin += 1.5;
    if (!weekend && admin < 1) admin = 1;
    const R = Math.max(0, H - admin - demoH);

    const wP = d.newLeads + 0.5;
    const wF = d.followUpLeads > 0 ? d.followUpLeads + d.repliedLeads * 0.5 + 0.5 : 0;
    const wSum = wP + wF;

    let fu = wF > 0 ? roundStep((R * wF) / wSum) : 0;
    let pros = roundStep(R - fu);
    if (pros < 0) {
      fu += pros;
      pros = 0;
    }
    if (weekend && pros === 0 && fu === 0 && demoH === 0) pros = R;

    const add = (category: TimesheetCategory, hours: number) => {
      if (hours >= 0.5) rows.push({ date: d.date, category, account: "", hours, notes: notesFor(category, d, hasExtra ? input.extra : "") });
    };
    add("prospecting", pros);
    add("follow_up", fu);
    add("admin", admin);
  }

  // A complete week must land inside 38.5–44h: nudge the prospecting rows
  // one step at a time until it does.
  const sum = () => rows.reduce((s, r) => s + r.hours, 0);
  if (weekdays.length === 5 && weekdays.every((d) => d.date >= FULL_DAYS_FROM)) {
    const pros = rows.filter((r) => r.category === "prospecting" && r.hours > 0).sort((a, b) => b.hours - a.hours);
    for (let guard = 0; guard < 200 && pros.length; guard++) {
      const t = sum();
      if (t > MAX_WEEK_HOURS) pros[guard % pros.length].hours -= STEP;
      else if (t < MIN_WEEK_HOURS) pros[guard % pros.length].hours += STEP;
      else break;
    }
  }

  // Weekly totals the manager looks at, appended to the last Admin note.
  if (input.summary && rows.length) {
    const s = input.summary;
    const line = ` Rekap minggu ini: ${s.clients} client dichat (${s.newLeads} lead baru), ${s.replied} client membalas, ${s.demos} demo/pertemuan.`;
    const lastAdmin = [...rows].reverse().find((r) => r.category === "admin") ?? rows[rows.length - 1];
    lastAdmin.notes += line;
  }

  return { target, total: sum(), rows };
}
