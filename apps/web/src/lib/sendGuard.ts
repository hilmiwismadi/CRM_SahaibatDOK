import { db } from "@/lib/db";

/**
 * Send guard — keeps this account from sending in a pattern WhatsApp reads as
 * a spam bot (what got the number restricted on 2026-10-13/14): many near-
 * identical messages to different people, in a tight burst, at any hour.
 *
 * The guard never *blocks*; it answers "when is the earliest slot at which
 * sending this message still looks human?". If that slot is not "now", the
 * caller queues the message in `scheduled_messages` for that slot instead of
 * sending (see sendOrSchedule in waSend.ts, dispatcher in
 * scheduledDispatcher.ts). The rep can always override with "send now".
 *
 * Only OUTREACH counts: messages to someone who has not written to us in the
 * last 24h. A back-and-forth reply to a lead who just messaged is ordinary
 * conversation — it is neither delayed nor counted against the limits.
 *
 * All numbers live in GUARD below; tune them there (no UI/DB setting yet).
 */
export const GUARD = {
  /** Minimum pause between two outreach messages (random in [lo, hi] seconds, so it is not metronomic). */
  minGapSec: [60, 120] as [number, number],
  /** Pause when the text is (nearly) the same as a recent message to another contact. */
  dupGapSec: [240, 420] as [number, number],
  /** How far back "recent message" looks for similar text. */
  dupLookbackMin: 180,
  /** Jaccard word-overlap at/above which two texts count as "the same template" (names differ, pitch is the same). */
  dupSimilarity: 0.75,
  /** At most `burstMax` outreach messages inside any `burstWindowMin` minutes… */
  burstWindowMin: 10,
  burstMax: 5,
  /** …and at most `hourlyMax` inside any 60 minutes. */
  hourlyMax: 20,
  /** Hard ceiling of outreach messages per WIB calendar day. */
  dailyMax: 40,
  /** Sending window in WIB hours [start, end). Outside it, the slot moves to the next start (+ small random offset). */
  activeHoursWib: [8, 20] as [number, number],
  /** A slot within this many seconds of now counts as "send immediately". */
  slackSec: 5,
  /** A contact who wrote to us within this many hours makes the reply conversational (exempt). */
  conversationHours: 24,
};

const WIB_OFFSET_MS = 7 * 3600_000;
const MIN = 60_000;

interface GuardEvent {
  t: number;
  tokens: Set<string>;
  phone: string | null;
  outreach: boolean;
  queued: boolean;
}

export interface SendPlan {
  /** When this message should go out. Equals "now" (± slack) when it can be sent immediately. */
  slot: Date;
  immediate: boolean;
  /** True when the recipient was already in an ongoing conversation (guard skipped). */
  conversational: boolean;
  outreach: boolean;
  reasons: string[];
}

// ------------------------------------------------------------------ helpers
export function tokenize(text: string | null | undefined): Set<string> {
  const words = (text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
  return new Set(words);
}

/** Same template? Short texts must match exactly; longer ones by word overlap (so "Halo dr. A" vs "Halo dr. B" still match). */
export function similar(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  const union = a.size + b.size - inter;
  if (Math.min(a.size, b.size) < 4) return inter === a.size && inter === b.size;
  return inter / union >= GUARD.dupSimilarity;
}

const wibHour = (ms: number) => new Date(ms + WIB_OFFSET_MS).getUTCHours();
const wibDayKey = (ms: number) => Math.floor((ms + WIB_OFFSET_MS) / 86_400_000);
const inActiveHours = (ms: number) => {
  const h = wibHour(ms);
  return h >= GUARD.activeHoursWib[0] && h < GUARD.activeHoursWib[1];
};
/** Next moment (>= ms) that opens a sending window, in UTC ms. */
function nextActiveStart(ms: number): number {
  const d = new Date(ms + WIB_OFFSET_MS);
  let dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), GUARD.activeHoursWib[0]) - WIB_OFFSET_MS;
  if (dayStart < ms) dayStart += 86_400_000;
  return dayStart;
}
const rand = ([lo, hi]: [number, number]) => (lo + Math.random() * (hi - lo)) * 1000;

function fmtGap(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 90 ? `${s} detik` : `${Math.round(s / 60)} menit`;
}

// ------------------------------------------------------------------ data
async function loadEvents(nowMs: number, includeQueued: boolean, excludeId?: string): Promise<GuardEvent[]> {
  const since = new Date(nowMs - 26 * 3600_000);
  const sent = await db.waMessage.findMany({
    where: { direction: "outbound", sentAt: { gte: since } },
    select: { sentAt: true, body: true, waContactId: true, waContact: { select: { phoneNormalized: true } } },
    orderBy: { sentAt: "asc" },
  });

  // Inbound times per contact → "was this outbound a reply inside a live conversation?"
  const contactIds = [...new Set(sent.map((m) => m.waContactId))];
  const inbound = contactIds.length
    ? await db.waMessage.findMany({
        where: { direction: "inbound", waContactId: { in: contactIds }, sentAt: { gte: new Date(nowMs - 52 * 3600_000) } },
        select: { waContactId: true, sentAt: true },
      })
    : [];
  const inboundBy = new Map<string, number[]>();
  for (const m of inbound) {
    const arr = inboundBy.get(m.waContactId) ?? [];
    arr.push(m.sentAt.getTime());
    inboundBy.set(m.waContactId, arr);
  }
  const convMs = GUARD.conversationHours * 3600_000;

  const events: GuardEvent[] = sent.map((m) => {
    const t = m.sentAt.getTime();
    const conv = (inboundBy.get(m.waContactId) ?? []).some((it) => it <= t && t - it <= convMs);
    return { t, tokens: tokenize(m.body), phone: m.waContact.phoneNormalized, outreach: !conv, queued: false };
  });

  if (includeQueued) {
    const queued = await db.scheduledMessage.findMany({
      where: { status: { in: ["queued", "sending"] }, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { scheduledFor: true, body: true, phoneNormalized: true, outreach: true },
    });
    for (const q of queued) {
      events.push({ t: q.scheduledFor.getTime(), tokens: tokenize(q.body), phone: q.phoneNormalized, outreach: q.outreach, queued: true });
    }
  }
  return events.sort((a, b) => a.t - b.t);
}

async function isConversational(phone: string, nowMs: number): Promise<boolean> {
  const inbound = await db.waMessage.findFirst({
    where: {
      direction: "inbound",
      waContact: { phoneNormalized: phone },
      sentAt: { gte: new Date(nowMs - GUARD.conversationHours * 3600_000) },
    },
    select: { id: true },
  });
  return Boolean(inbound);
}

// ------------------------------------------------------------------ planner
export interface PlanOptions {
  phone: string;
  body: string;
  now?: Date;
  /** false = only look at what was really sent (used by the dispatcher, which handles ordering itself). */
  includeQueued?: boolean;
  /** Ignore this scheduled row (it is the message being dispatched). */
  excludeId?: string;
}

export async function planSend(opts: PlanOptions): Promise<SendPlan> {
  const nowMs = (opts.now ?? new Date()).getTime();
  const includeQueued = opts.includeQueued ?? true;

  if (await isConversational(opts.phone, nowMs)) {
    return { slot: new Date(nowMs), immediate: true, conversational: true, outreach: false, reasons: [] };
  }

  const events = (await loadEvents(nowMs, includeQueued, opts.excludeId)).filter((e) => e.outreach);
  const tokens = tokenize(opts.body);
  const reasons: string[] = [];
  const note = (r: string) => {
    if (!reasons.includes(r)) reasons.push(r);
  };

  let cand = nowMs;
  // FIFO: a new message never jumps ahead of messages that are already queued.
  const lastQueued = events.filter((e) => e.queued).reduce((m, e) => Math.max(m, e.t), 0);
  if (lastQueued > cand) {
    cand = lastQueued;
    note(`Sudah ada ${events.filter((e) => e.queued).length} pesan lain dalam antrean`);
  }

  for (let i = 0; i < 500; i++) {
    let moved = false;
    const upTo = events.filter((e) => e.t <= cand);

    // 1. Sending window
    if (!inActiveHours(cand)) {
      cand = nextActiveStart(cand) + rand([0, 300]);
      note(`Di luar jam kirim ${GUARD.activeHoursWib[0]}.00–${GUARD.activeHoursWib[1]}.00 WIB`);
      moved = true;
      continue;
    }

    // 2. Minimum gap after the previous outreach message
    const last = upTo.length ? upTo[upTo.length - 1] : null;
    if (last && cand - last.t < GUARD.minGapSec[0] * 1000) {
      note(`Pesan keluar sebelumnya baru ${fmtGap(nowMs - last.t)} lalu`);
      cand = last.t + rand(GUARD.minGapSec);
      moved = true;
    }

    // 3. Same template sent to someone else a moment ago
    const dupSince = cand - GUARD.dupLookbackMin * MIN;
    const sameText = upTo.filter((e) => e.t >= dupSince && e.phone !== opts.phone && similar(tokens, e.tokens));
    const lastSame = sameText.length ? sameText[sameText.length - 1] : null;
    if (lastSame && cand - lastSame.t < GUARD.dupGapSec[0] * 1000) {
      const people = new Set(sameText.map((e) => e.phone)).size;
      note(`Isi pesan hampir sama dengan pesan ke ${people} kontak lain dalam ${GUARD.dupLookbackMin} menit terakhir`);
      cand = lastSame.t + rand(GUARD.dupGapSec);
      moved = true;
    }

    // 4. Burst + hourly caps (sliding windows ending at cand)
    for (const [windowMin, max, label] of [
      [GUARD.burstWindowMin, GUARD.burstMax, `Sudah ${GUARD.burstMax} pesan dalam ${GUARD.burstWindowMin} menit`],
      [60, GUARD.hourlyMax, `Sudah ${GUARD.hourlyMax} pesan dalam 1 jam terakhir`],
    ] as [number, number, string][]) {
      const win = events.filter((e) => e.t <= cand && e.t > cand - windowMin * MIN);
      if (win.length >= max) {
        note(label);
        cand = win[win.length - max].t + windowMin * MIN + rand([5, 45]);
        moved = true;
      }
    }

    // 5. Daily ceiling
    const day = wibDayKey(cand);
    const today = events.filter((e) => wibDayKey(e.t) === day && e.t <= cand);
    if (today.length >= GUARD.dailyMax) {
      note(`Batas harian ${GUARD.dailyMax} pesan tercapai`);
      cand = nextActiveStart(cand + 86_400_000 - ((cand + WIB_OFFSET_MS) % 86_400_000)) + rand([0, 300]);
      moved = true;
    }

    if (!moved) break;
  }

  const immediate = cand - nowMs <= GUARD.slackSec * 1000;
  return { slot: new Date(immediate ? nowMs : Math.ceil(cand / 1000) * 1000), immediate, conversational: false, outreach: true, reasons: immediate ? [] : reasons };
}
