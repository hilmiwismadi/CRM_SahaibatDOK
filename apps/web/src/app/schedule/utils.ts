// Shared types + date helpers for /schedule. Everything here works on local
// "YYYY-MM-DD" day strings so the calendar never shifts an item across
// midnight because of the UTC offset.

export type ItemKind = "followup" | "demo_gmeet" | "visit" | "other";
export type ItemStatus = "scheduled" | "done" | "cancelled";

export interface ScheduleItem {
  key: string;
  kind: ItemKind;
  leadId: string;
  leadName: string;
  /** Local "YYYY-MM-DD" the item belongs to. */
  day: string;
  /** Local "HH:MM", or null for a date-only follow-up. */
  time: string | null;
  /** Sort key (ms); date-only items sort at local midnight of their day. */
  startMs: number;
  durationMin: number;
  note: string | null;
  location: string | null;
  status: ItemStatus;
  waContactId?: string;
  appointmentId?: string;
}

export interface ScheduleResponse {
  followUps: {
    waContactId: string;
    leadId: string;
    leadName: string;
    followUpAt: string;
    hasTime: boolean;
    note: string | null;
  }[];
  appointments: {
    id: string;
    leadId: string;
    leadName: string;
    kind: "demo_gmeet" | "visit" | "other";
    startsAt: string;
    durationMin: number;
    location: string | null;
    note: string | null;
    status: ItemStatus;
  }[];
}

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function hhmm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Local midnight of a "YYYY-MM-DD" string. */
export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(day: string, n: number): string {
  const d = parseYmd(day);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/** Monday of the week containing `day`. */
export function startOfWeek(day: string): string {
  const d = parseYmd(day);
  const dow = (d.getDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setDate(d.getDate() - dow);
  return ymd(d);
}

/** Day + optional time -> ISO instant (UTC) for the API. */
export function toIso(day: string, time: string): string {
  return new Date(`${day}T${time}`).toISOString();
}

export function buildItems(data: ScheduleResponse): ScheduleItem[] {
  const items: ScheduleItem[] = [];
  for (const f of data.followUps) {
    // Date-only follow-ups are stored as that date at 00:00 UTC — read the
    // day straight from the ISO string rather than converting to local.
    const at = new Date(f.followUpAt);
    const day = f.hasTime ? ymd(at) : f.followUpAt.slice(0, 10);
    items.push({
      key: `f-${f.waContactId}`,
      kind: "followup",
      leadId: f.leadId,
      leadName: f.leadName,
      day,
      time: f.hasTime ? hhmm(at) : null,
      startMs: f.hasTime ? at.getTime() : parseYmd(day).getTime(),
      durationMin: 30,
      note: f.note,
      location: null,
      status: "scheduled",
      waContactId: f.waContactId,
    });
  }
  for (const a of data.appointments) {
    const at = new Date(a.startsAt);
    items.push({
      key: `a-${a.id}`,
      kind: a.kind,
      leadId: a.leadId,
      leadName: a.leadName,
      day: ymd(at),
      time: hhmm(at),
      startMs: at.getTime(),
      durationMin: a.durationMin,
      note: a.note,
      location: a.location,
      status: a.status,
      appointmentId: a.id,
    });
  }
  return items.sort((x, y) => x.startMs - y.startMs);
}

export const KIND_STYLE: Record<ItemKind, { chip: string; block: string; dot: string }> = {
  followup: {
    chip: "bg-amber-50 text-amber-800 border-amber-200",
    block: "bg-amber-100 border-amber-400 text-amber-900",
    dot: "bg-amber-400",
  },
  demo_gmeet: {
    chip: "bg-cyan-50 text-cyan-800 border-cyan-200",
    block: "bg-cyan-100 border-cyan-500 text-cyan-900",
    dot: "bg-cyan-500",
  },
  visit: {
    chip: "bg-emerald-50 text-emerald-800 border-emerald-200",
    block: "bg-emerald-100 border-emerald-500 text-emerald-900",
    dot: "bg-emerald-500",
  },
  other: {
    chip: "bg-slate-100 text-slate-700 border-slate-200",
    block: "bg-slate-200 border-slate-400 text-slate-800",
    dot: "bg-slate-400",
  },
};

export function isUrl(s: string | null): boolean {
  return !!s && /^https?:\/\//i.test(s.trim());
}
