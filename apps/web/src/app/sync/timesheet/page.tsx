"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import AppSidebar from "@/app/components/AppSidebar";
import SyncTabs from "../SyncTabs";

type Category = "prospecting" | "demo" | "follow_up" | "admin" | "travel" | "training";

interface LeadDetail {
  leadId: string;
  name: string;
  isNew: boolean;
  sent: ("konfirmasi" | "pitch" | "lainnya")[];
  outbound: number;
  inbound: number;
  replied: boolean;
  replies: string[];
  schedule: string[];
  summary: string | null;
}

interface DayStats {
  date: string;
  weekday: number;
  leadsChatted: number;
  newLeads: number;
  confirm: number;
  pitch: number;
  repliedLeads: number;
  followUpLeads: number;
  scheduleLeads: number;
  outbound: number;
  inbound: number;
  demos: { leadName: string; kind: string; time: string; hours: number }[];
  leads: LeadDetail[];
}

interface Meeting {
  date: string;
  time: string;
  kind: string;
  status: string;
  leadName: string;
  durationMin: number;
  location: string | null;
  counted: boolean;
}

// A meeting the rep adds here by hand (never recorded in Jadwal); sent to the API as `demos`.
interface ManualDemo {
  date: string;
  time: string;
  leadName: string;
  kind: string;
  durationMin: number;
}

interface WeekSummary {
  clients: number;
  replied: number;
  newLeads: number;
  demos: number;
}

interface PlanRow {
  date: string;
  category: Category;
  account: string;
  hours: number;
  notes: string;
}

interface TimesheetResponse {
  weekStart: string;
  weekEnd: string;
  today: string;
  target: number;
  total: number;
  summary: WeekSummary;
  meetings: Meeting[];
  days: DayStats[];
  rows: PlanRow[];
}

interface EditRow extends PlanRow {
  id: number;
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "prospecting", label: "Prospecting" },
  { value: "demo", label: "Demo" },
  { value: "follow_up", label: "Follow-up" },
  { value: "admin", label: "Admin" },
  { value: "travel", label: "Travel" },
  { value: "training", label: "Training" },
];

const KIND_LABEL: Record<string, string> = { demo_gmeet: "Demo Gmeet", visit: "Kunjungan", other: "Pertemuan" };
const SENT_LABEL: Record<string, string> = { konfirmasi: "konfirmasi nomor", pitch: "pitch riset", lainnya: "chat lanjutan" };

const DAY_NAMES = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MIN_HOURS = 38.5;
const MAX_HOURS = 44;

// Per-week defaults the rep asked for: add this week's work on the personal
// CRM tools as Admin time. Sunday the 11th was first left empty (2026-10-11),
// then filled as an Admin-only day (2026-10-12) — nothing is skipped now.
const DEFAULT_SKIP: Record<string, string[]> = {};
const DEFAULT_EXTRA: Record<string, string> = {
  "2026-10-05": "pengembangan dan update tools CRM pribadi (sync lead, daily log, timesheet)",
};

function todayWibString(): string {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const dow = d.getUTCDay() || 7;
  return new Date(d.getTime() - (dow - 1) * 86400000).toISOString().slice(0, 10);
}

function shiftWeek(weekStart: string, n: number): string {
  return new Date(new Date(`${weekStart}T00:00:00Z`).getTime() + n * 7 * 86400000).toISOString().slice(0, 10);
}

function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const dow = d.getUTCDay() || 7;
  return `${DAY_NAMES[dow - 1]} ${d.getUTCDate()}`;
}

function storageKey(weekStart: string) {
  // Bump the version whenever planWeek()'s output format changes, so drafts
  // saved by an older version are not shown instead of the new format
  // (v2: 2026-10-12; v3: 2026-10-26, lead baru per lead + manual demos).
  return `sync-timesheet-v3-${weekStart}`;
}

// The script drives sales.sahaibat.com/timesheet's OWN "Add an entry" form
// (set Day / Hours / Category / Account / Notes, click Add), so it goes
// through exactly the requests the page itself makes — nothing is guessed
// about the write API. It only checks reads (GET /api/timesheets,
// GET /api/time-entries) for the week status and for duplicates. Entries
// stay DRAFT; the weekly "Submit for approval" is always clicked by the rep.
// NOTE: the JS body below must not contain backticks, backslashes or "${" —
// it lives inside a TS template literal.
function buildScript(weekStart: string, rows: PlanRow[], apply: boolean): string {
  const lines = rows
    .filter((r) => r.hours > 0)
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1))
    .map(
      (r) =>
        `  { date: ${JSON.stringify(r.date)}, category: ${JSON.stringify(r.category)}, account: ${JSON.stringify(r.account)}, hours: ${r.hours}, notes: ${JSON.stringify(r.notes)} },`,
    )
    .join("\n");

  return `/**
 * TIMESHEET DRAFT — minggu ${weekStart}. Edit ENTRIES kalau perlu, lalu paste
 * SELURUH blok ini ke DevTools Console di sales.sahaibat.com/timesheet
 * (sudah login, dan tampilkan minggu ${weekStart} dengan tombol ‹ ›).
 *
 * Mengisi form "Add an entry" milik halaman itu sendiri, satu baris per entri,
 * lalu klik Add. Hasilnya hanya DRAFT; tombol "Submit for approval" tetap
 * kamu klik sendiri. Entri yang sama (tanggal + kategori + catatan) yang
 * sudah ada dilewati. Minggu yang bukan draft tidak disentuh.
 *
 * APPLY = true: benar-benar menambahkan entri ke draft. APPLY = false adalah
 * dry run (hanya mencetak apa yang akan dilakukan).
 */
const APPLY = ${apply};
const WEEK = ${JSON.stringify(weekStart)};

const ENTRIES = [
${lines}
];

const CATEGORIES = ["prospecting", "demo", "follow_up", "admin", "travel", "training"];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function setValue(el, value) {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

async function getJson(url) {
  const r = await fetch(url, { credentials: "include", cache: "no-store" });
  return r.ok ? r.json() : null;
}

function findForm() {
  const main = document.querySelector("main") || document;
  const selects = main.querySelectorAll("select");
  const hours = main.querySelector("input[type=number]");
  const notes = main.querySelector("textarea") || [...main.querySelectorAll("input")].find((i) => i.type !== "number" && i.type !== "hidden");
  const add = [...main.querySelectorAll("button")].find((b) => /^(add|tambah)$/i.test(b.textContent.trim()));
  if (selects.length < 3 || !hours || !notes || !add) return null;
  return { day: selects[0], category: selects[1], account: selects[2], hours, notes, add };
}

async function run() {
  console.log("=== TIMESHEET " + WEEK + " (" + (APPLY ? "APPLY" : "DRY RUN") + "): " + ENTRIES.length + " entri ===");
  const form = findForm();
  if (!form) return console.error("Form 'Add an entry' tidak ditemukan. Buka sales.sahaibat.com/timesheet pada minggu draft.");
  if (![...form.day.options].some((o) => o.value === WEEK)) {
    return console.error("Halaman sedang menampilkan minggu lain. Tekan ‹ atau › sampai minggu dimulai " + WEEK + ", lalu jalankan ulang.");
  }

  const ts = await getJson("/api/timesheets?week=" + WEEK);
  const status = ts && ts.timesheet ? ts.timesheet.status : "draft";
  if (status !== "draft") return console.error("Minggu ini berstatus '" + status + "' (terkunci), tidak ada yang diubah.");

  const existing = ((await getJson("/api/time-entries?week=" + WEEK)) || {}).entries || [];
  let count = existing.length;
  const rep = { added: [], skipped: [], failed: [] };

  let n = 0;
  for (const e of ENTRIES) {
    n++;
    const tag = "[" + n + "/" + ENTRIES.length + "] " + e.date + " " + e.category + " " + e.hours + "j";
    if (!CATEGORIES.includes(e.category)) { console.warn(tag + " - kategori tidak dikenal, dilewati"); rep.failed.push(tag); continue; }
    if (![...form.day.options].some((o) => o.value === e.date)) { console.warn(tag + " - tanggal di luar minggu ini, dilewati"); rep.failed.push(tag); continue; }
    const dup = existing.some((x) => x.entryDate === e.date && x.category === e.category && x.notes === e.notes);
    if (dup) { console.log(tag + " - sudah ada, dilewati"); rep.skipped.push(tag); continue; }

    let accountNote = "";
    let accountValue = "";
    if (e.account) {
      const opt = [...form.account.options].find((o) => o.textContent.trim().toLowerCase().includes(e.account.toLowerCase()));
      if (opt) accountValue = opt.value; else accountNote = " (akun '" + e.account + "' tidak ada di dropdown, dikosongkan)";
    }

    if (!APPLY) { console.log(tag + " - (dry run) akan ditambahkan" + accountNote + ": " + e.notes); rep.added.push(tag + " (dry run)"); continue; }

    setValue(form.day, e.date);
    setValue(form.category, e.category);
    setValue(form.account, accountValue);
    setValue(form.hours, String(e.hours));
    setValue(form.notes, e.notes);
    await wait(150);
    form.add.click();

    let ok = false;
    for (let i = 0; i < 40 && !ok; i++) {
      await wait(250);
      const now = ((await getJson("/api/time-entries?week=" + WEEK)) || {}).entries || [];
      if (now.length > count) { ok = true; count = now.length; }
    }
    if (ok) { console.log(tag + " - OK ditambahkan" + accountNote); rep.added.push(tag); } else { console.error(tag + " - belum terlihat di server, cek manual"); rep.failed.push(tag); }
    await wait(300);
  }

  const final = ((await getJson("/api/time-entries?week=" + WEEK)) || {}).entries || [];
  const total = final.reduce((s, x) => s + Number(x.hours || 0), 0);
  console.log("=== RINGKASAN (" + (APPLY ? "APPLY" : "DRY RUN") + ") ===");
  console.log("Ditambahkan: " + rep.added.length, rep.added);
  console.log("Dilewati (sudah ada): " + rep.skipped.length, rep.skipped);
  console.log("Gagal: " + rep.failed.length, rep.failed);
  console.log("Total di server: " + final.length + " entri, " + total + " jam. Submit for approval tetap kamu klik sendiri.");
  return rep;
}

run().catch((err) => console.error("SCRIPT ERROR:", err));
`;
}

export default function TimesheetPage() {
  const [week, setWeek] = useState(mondayOf(todayWibString()));
  const [data, setData] = useState<TimesheetResponse | null>(null);
  const [rows, setRows] = useState<EditRow[]>([]);
  const [skip, setSkip] = useState<string[]>([]);
  const [extra, setExtra] = useState("");
  const [demos, setDemos] = useState<ManualDemo[]>([]);
  const [demoForm, setDemoForm] = useState<ManualDemo>({ date: "", time: "13:00", leadName: "", kind: "demo_gmeet", durationMin: 60 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [apply, setApply] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const nextId = useRef(1);
  const scriptRef = useRef<HTMLTextAreaElement>(null);

  function withIds(list: PlanRow[]): EditRow[] {
    return list.map((r) => ({ ...r, id: nextId.current++ }));
  }

  async function fetchPlan(weekStart: string, skipList: string[], extraText: string, demoList: ManualDemo[]): Promise<TimesheetResponse> {
    const qs = new URLSearchParams({ week: weekStart, skip: skipList.join(","), extra: extraText, demos: JSON.stringify(demoList) });
    const r = await fetch(`/api/sync/timesheet?${qs.toString()}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  // Load a week: restore the rep's saved edits if there are any, otherwise
  // generate a fresh draft from the chat data.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      let saved: { rows: PlanRow[]; skip: string[]; extra: string; demos?: ManualDemo[] } | null = null;
      try {
        const raw = window.localStorage.getItem(storageKey(week));
        if (raw) saved = JSON.parse(raw);
      } catch {
        // localStorage unavailable — fall through to a fresh draft.
      }
      const skipList = saved?.skip ?? DEFAULT_SKIP[week] ?? [];
      const extraText = saved?.extra ?? DEFAULT_EXTRA[week] ?? "";
      const demoList = saved?.demos ?? [];
      try {
        const d = await fetchPlan(week, skipList, extraText, demoList);
        if (cancelled) return;
        setData(d);
        setSkip(skipList);
        setExtra(extraText);
        setDemos(demoList);
        setDemoForm((f) => ({ ...f, date: d.weekStart }));
        setRows(withIds(saved ? saved.rows : d.rows));
      } catch (e) {
        if (!cancelled) setError(`Gagal memuat data: ${(e as Error).message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [week]);

  function persist(nextRows: EditRow[], nextSkip: string[], nextExtra: string, nextDemos: ManualDemo[] = demos) {
    try {
      window.localStorage.setItem(
        storageKey(week),
        JSON.stringify({ rows: nextRows.map(({ id: _id, ...r }) => r), skip: nextSkip, extra: nextExtra, demos: nextDemos }),
      );
    } catch {
      // per-viewer convenience only.
    }
  }

  function updateRows(next: EditRow[]) {
    setRows(next);
    persist(next, skip, extra);
  }

  function patchRow(id: number, patch: Partial<PlanRow>) {
    updateRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    updateRows([...rows, { id: nextId.current++, date: week, category: "admin", account: "", hours: 1, notes: "" }]);
  }

  function removeRow(id: number) {
    updateRows(rows.filter((r) => r.id !== id));
  }

  // A demo changes the hours and the weekly recap, so adding/removing one
  // regenerates the draft (table edits are discarded, like "Hitung ulang draft").
  async function recompute(demoList: ManualDemo[] = demos) {
    setLoading(true);
    setError("");
    try {
      const d = await fetchPlan(week, skip, extra, demoList);
      setData(d);
      setDemos(demoList);
      const next = withIds(d.rows);
      setRows(next);
      persist(next, skip, extra, demoList);
    } catch (e) {
      setError(`Gagal memuat data: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  function addDemo() {
    if (!demoForm.date || !demoForm.time || !demoForm.leadName.trim()) return;
    recompute([...demos, { ...demoForm, leadName: demoForm.leadName.trim() }]);
    setDemoForm({ ...demoForm, leadName: "" });
  }

  function removeDemo(i: number) {
    recompute(demos.filter((_, j) => j !== i));
  }

  function toggleSkip(date: string) {
    const next = skip.includes(date) ? skip.filter((d) => d !== date) : [...skip, date];
    setSkip(next);
    persist(rows, next, extra);
  }

  const total = useMemo(() => rows.reduce((s, r) => s + (Number(r.hours) || 0), 0), [rows]);
  const script = useMemo(
    () => buildScript(week, rows.map(({ id: _id, ...r }) => ({ ...r, hours: Number(r.hours) || 0 })), apply),
    [week, rows, apply],
  );
  const totalOk = total >= MIN_HOURS && total <= MAX_HOURS;
  const weekDates = data?.days.map((d) => d.date) ?? [];
  const weekLeadNames = useMemo(() => [...new Set(data?.days.flatMap((d) => d.leads.map((l) => l.name)) ?? [])].sort(), [data]);
  // Manual demos the API dropped because Jadwal already has that lead that day.
  const shadowed = demos.filter((dm) => !data?.meetings.some((m) => m.status === "manual" && m.date === dm.date && m.leadName === dm.leadName));

  // Same plain-HTTP clipboard fallback as /sync/dailylog (navigator.clipboard
  // is absent outside a secure context).
  async function copyScript() {
    setCopyError(false);
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(script);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        // fall through to the legacy path below
      }
    }
    const el = scriptRef.current;
    if (!el) {
      setCopyError(true);
      return;
    }
    el.focus();
    el.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyError(true);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="sync" />
      <div className="flex-1 overflow-y-auto px-3 pb-6 md:p-6">
        <h1 className="mt-3 mb-1 text-lg font-bold text-slate-900 md:mt-0">CRM Sync</h1>
        <p className="mb-4 text-sm text-slate-500">
          Draft timesheet mingguan dari riwayat chat WA. Edit tabel di bawah — script mengikuti isi tabel — lalu paste ke console sales.sahaibat.com/timesheet.
        </p>
        <SyncTabs />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setWeek(shiftWeek(week, -1))}
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm md:h-auto md:py-1.5"
            aria-label="Minggu sebelumnya"
          >
            ‹
          </button>
          <label className="flex items-center text-sm font-medium text-slate-600">
            Minggu
            <input
              type="date"
              value={week}
              onChange={(e) => e.target.value && setWeek(mondayOf(e.target.value))}
              className="ml-2 h-11 rounded-lg border border-slate-300 px-2 py-1 text-sm md:h-auto"
            />
          </label>
          <button
            onClick={() => setWeek(shiftWeek(week, 1))}
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm md:h-auto md:py-1.5"
            aria-label="Minggu berikutnya"
          >
            ›
          </button>
          {data && (
            <span className="text-sm text-slate-500">
              {dayLabel(data.weekStart)} – {dayLabel(data.weekEnd)} · target {data.target} jam
            </span>
          )}
        </div>

        {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {loading && <div className="text-sm text-slate-400">Memuat…</div>}

        {!loading && data && (
          <>
            {/* What the manager sees: clients chatted + demos done */}
            <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
              {[
                { label: "Client dichat (unik)", value: data.summary.clients },
                { label: "Lead baru (cold chat)", value: data.summary.newLeads },
                { label: "Client membalas", value: data.summary.replied },
                { label: "Demo / pertemuan", value: data.summary.demos },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="text-2xl font-bold text-slate-800">{c.value}</div>
                  <div className="text-xs text-slate-500">{c.label}</div>
                </div>
              ))}
            </div>

            <div className="mb-1 text-sm font-semibold text-slate-700">Demo / pertemuan minggu ini (dari menu Jadwal + tambahan manual)</div>
            <div className="mb-4 rounded-xl border border-slate-200 bg-white">
              {data.meetings.length === 0 && demos.length === 0 && (
                <div className="p-3 text-sm text-slate-400">
                  Belum ada demo/pertemuan tercatat di Jadwal minggu ini. Demo hanya dihitung dari Jadwal atau dari tambahan manual di bawah (bukan dari tebakan chat).
                </div>
              )}
              {data.meetings.filter((m) => m.status !== "manual").map((m, i) => (
                <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 px-3 py-2 text-sm first:border-t-0">
                  <span className="font-medium whitespace-nowrap text-slate-800">
                    {dayLabel(m.date)} {m.time}
                  </span>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">{KIND_LABEL[m.kind] ?? m.kind}</span>
                  <span className="text-slate-700">{m.leadName}</span>
                  <span className={`text-xs ${m.counted ? "text-emerald-600" : "text-amber-600"}`}>
                    {m.status === "done" ? "selesai" : m.counted ? "terjadwal, sudah lewat (cek status di Jadwal)" : "belum terjadi — tidak dihitung"}
                  </span>
                </div>
              ))}
              {demos.map((m, i) => (
                <div key={`manual-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 px-3 py-2 text-sm first:border-t-0">
                  <span className="font-medium whitespace-nowrap text-slate-800">
                    {dayLabel(m.date)} {m.time}
                  </span>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">{KIND_LABEL[m.kind] ?? m.kind}</span>
                  <span className="text-slate-700">{m.leadName}</span>
                  <span className="text-xs text-slate-400">{m.durationMin} menit</span>
                  <span className={`text-xs ${shadowed.includes(m) ? "text-amber-600" : "text-emerald-600"}`}>
                    {shadowed.includes(m) ? "manual — sudah ada di Jadwal, tidak dihitung dua kali" : "manual"}
                  </span>
                  <button
                    onClick={() => removeDemo(i)}
                    className="ml-auto h-9 rounded-lg border border-slate-300 px-2 text-xs text-slate-500 hover:bg-slate-50"
                    aria-label="Hapus demo manual"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/60 p-3 md:grid-cols-[110px_90px_1fr_130px_90px_auto]">
                <select
                  value={demoForm.date}
                  onChange={(e) => setDemoForm({ ...demoForm, date: e.target.value })}
                  className="h-11 rounded-lg border border-slate-300 bg-white px-2 text-sm md:h-9"
                  aria-label="Hari"
                >
                  {weekDates.map((dt) => (
                    <option key={dt} value={dt}>
                      {dayLabel(dt)}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={demoForm.time}
                  onChange={(e) => setDemoForm({ ...demoForm, time: e.target.value })}
                  className="h-11 rounded-lg border border-slate-300 bg-white px-2 text-sm md:h-9"
                  aria-label="Jam"
                />
                <input
                  type="text"
                  list="timesheet-lead-names"
                  value={demoForm.leadName}
                  placeholder="Nama lead / klinik"
                  onChange={(e) => setDemoForm({ ...demoForm, leadName: e.target.value })}
                  className="col-span-2 h-11 rounded-lg border border-slate-300 bg-white px-2 text-sm md:col-span-1 md:h-9"
                />
                <datalist id="timesheet-lead-names">
                  {weekLeadNames.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
                <select
                  value={demoForm.kind}
                  onChange={(e) => setDemoForm({ ...demoForm, kind: e.target.value })}
                  className="h-11 rounded-lg border border-slate-300 bg-white px-2 text-sm md:h-9"
                  aria-label="Jenis"
                >
                  {Object.entries(KIND_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <select
                  value={demoForm.durationMin}
                  onChange={(e) => setDemoForm({ ...demoForm, durationMin: Number(e.target.value) })}
                  className="h-11 rounded-lg border border-slate-300 bg-white px-2 text-sm md:h-9"
                  aria-label="Durasi"
                >
                  {[15, 30, 45, 60, 90, 120].map((n) => (
                    <option key={n} value={n}>
                      {n} menit
                    </option>
                  ))}
                </select>
                <button
                  onClick={addDemo}
                  disabled={!demoForm.leadName.trim()}
                  className="col-span-2 h-11 rounded-lg border border-cyan-600 px-3 text-sm font-medium text-cyan-700 hover:bg-cyan-50 disabled:opacity-40 md:col-span-1 md:h-9"
                >
                  + Tambah demo
                </button>
              </div>
            </div>
            <div className="-mt-3 mb-4 text-xs text-slate-500">
              Demo manual disimpan di browser ini saja dan langsung menghitung ulang draft (editan tabel dibuang). Bila Gmeet itu nanti dicatat di Jadwal, yang manual otomatis tidak dihitung dua kali.
            </div>

            {/* Chat recap per day — click a row to see every lead behind the numbers */}
            <div className="mb-1 text-sm font-semibold text-slate-700">Rekap chat per hari (klik baris untuk rincian lead)</div>
            <div className="mb-2 overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Isi?</th>
                    <th className="px-3 py-2">Hari</th>
                    <th className="px-3 py-2 text-right">Lead dichat</th>
                    <th className="px-3 py-2 text-right">Lead baru</th>
                    <th className="px-3 py-2 text-right">Konfirmasi</th>
                    <th className="px-3 py-2 text-right">Pitch</th>
                    <th className="px-3 py-2 text-right">Membalas</th>
                    <th className="px-3 py-2 text-right">Follow-up</th>
                    <th className="px-3 py-2 text-right">Bahas jadwal</th>
                    <th className="px-3 py-2 text-right">Demo</th>
                    <th className="px-3 py-2 text-right">Keluar / masuk</th>
                  </tr>
                </thead>
                <tbody>
                  {data.days.map((d) => (
                    <Fragment key={d.date}>
                      <tr className="cursor-pointer border-t border-slate-100 hover:bg-slate-50" onClick={() => setOpen(open === d.date ? null : d.date)}>
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={!skip.includes(d.date)} onChange={() => toggleSkip(d.date)} className="h-4 w-4" />
                        </td>
                        <td className="px-3 py-2 font-medium whitespace-nowrap text-slate-800">
                          {open === d.date ? "▾" : "▸"} {dayLabel(d.date)}
                        </td>
                        <td className="px-3 py-2 text-right">{d.leadsChatted}</td>
                        <td className="px-3 py-2 text-right">{d.newLeads}</td>
                        <td className="px-3 py-2 text-right">{d.confirm}</td>
                        <td className="px-3 py-2 text-right">{d.pitch}</td>
                        <td className="px-3 py-2 text-right">{d.repliedLeads}</td>
                        <td className="px-3 py-2 text-right">{d.followUpLeads}</td>
                        <td className="px-3 py-2 text-right">{d.scheduleLeads}</td>
                        <td className="px-3 py-2 text-right">{d.demos.length}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {d.outbound} / {d.inbound}
                        </td>
                      </tr>
                      {open === d.date && (
                        <tr className="border-t border-slate-100 bg-slate-50/60">
                          <td colSpan={11} className="px-3 py-3">
                            {d.leads.length === 0 && <div className="text-sm text-slate-400">Tidak ada chat hari ini.</div>}
                            <ul className="space-y-2">
                              {d.leads.map((l) => (
                                <li key={l.leadId} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="font-medium text-slate-800">{l.name}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${l.isNew ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-600"}`}>
                                      {l.isNew ? "lead baru" : "follow-up"}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      kami kirim: {l.sent.length ? l.sent.map((x) => SENT_LABEL[x]).join(", ") : "—"} ({l.outbound} pesan)
                                    </span>
                                    <span className={`text-xs font-semibold ${l.replied ? "text-emerald-600" : "text-slate-400"}`}>
                                      {l.replied ? `membalas (${l.inbound} pesan)` : "belum membalas"}
                                    </span>
                                  </div>
                                  {l.summary && (
                                    <div className="mt-1 text-xs text-slate-700">
                                      <span className="font-semibold text-cyan-700">Ringkasan Claude:</span> {l.summary}
                                    </div>
                                  )}
                                  {!l.summary && l.replied && <div className="mt-1 text-xs text-amber-600">Ringkasan Claude belum ditulis untuk hari ini (catatan memakai kutipan balasan).</div>}
                                  {l.replies.map((r, i) => (
                                    <div key={i} className="mt-1 border-l-2 border-emerald-300 pl-2 text-xs break-words text-slate-600">
                                      {r}
                                    </div>
                                  ))}
                                  {l.schedule.map((r, i) => (
                                    <div key={i} className="mt-1 border-l-2 border-violet-300 pl-2 text-xs break-words text-violet-700">
                                      Jadwal — {r}
                                    </div>
                                  ))}
                                </li>
                              ))}
                            </ul>
                            {d.demos.length > 0 && (
                              <div className="mt-2 text-xs text-slate-600">
                                Demo hari ini: {d.demos.map((x) => `${KIND_LABEL[x.kind] ?? x.kind} dengan ${x.leadName} (${x.time})`).join("; ")}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mb-4 text-xs text-slate-500">
              &quot;Lead dichat&quot; = lead dengan pesan apa pun hari itu. &quot;Bahas jadwal&quot; = lead yang percakapannya menyebut Gmeet/jadwal/hari (hanya petunjuk, lihat kutipan ungu) dan <b>bukan</b> jumlah demo; jumlah demo hanya dari menu Jadwal.
            </div>

            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end">
              <label className="flex-1 text-sm font-medium text-slate-600">
                Pekerjaan tambahan minggu ini (masuk Admin, kosongkan bila tidak ada)
                <input
                  type="text"
                  value={extra}
                  onChange={(e) => {
                    setExtra(e.target.value);
                    persist(rows, skip, e.target.value);
                  }}
                  className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm md:h-auto"
                />
              </label>
              <button
                onClick={() => recompute()}
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 md:h-auto md:py-1.5"
                title="Buang editan tabel, hitung ulang draft dari data chat + centang hari + pekerjaan tambahan"
              >
                Hitung ulang draft
              </button>
            </div>

            {/* Editable rows */}
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">Entri timesheet ({rows.length})</div>
              <div className={`text-sm font-semibold ${totalOk ? "text-emerald-600" : "text-amber-600"}`}>
                Total {total} jam
                <span className="ml-1 font-normal text-slate-400">
                  (target {data.target}, wajar {MIN_HOURS}–{MAX_HOURS})
                </span>
              </div>
            </div>
            <div className="mb-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {rows.length === 0 && <div className="p-4 text-sm text-slate-400">Belum ada entri.</div>}
              {rows.map((r) => (
                <div key={r.id} className="grid grid-cols-2 gap-2 p-3 md:grid-cols-[110px_140px_1fr_90px_36px] md:items-start">
                  <select
                    value={r.date}
                    onChange={(e) => patchRow(r.id, { date: e.target.value })}
                    className="h-11 rounded-lg border border-slate-300 px-2 text-sm md:h-9"
                  >
                    {weekDates.map((dt) => (
                      <option key={dt} value={dt}>
                        {dayLabel(dt)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={r.category}
                    onChange={(e) => patchRow(r.id, { category: e.target.value as Category })}
                    className="h-11 rounded-lg border border-slate-300 px-2 text-sm md:h-9"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={r.account}
                    placeholder="Akun (kosong = none)"
                    onChange={(e) => patchRow(r.id, { account: e.target.value })}
                    className="col-span-2 h-11 rounded-lg border border-slate-300 px-2 text-sm md:col-span-1 md:h-9"
                  />
                  <input
                    type="number"
                    step={0.25}
                    min={0}
                    value={r.hours}
                    onChange={(e) => patchRow(r.id, { hours: Number(e.target.value) })}
                    className="h-11 rounded-lg border border-slate-300 px-2 text-sm md:h-9"
                  />
                  <button
                    onClick={() => removeRow(r.id)}
                    className="h-11 rounded-lg border border-slate-300 text-sm text-slate-500 hover:bg-slate-50 md:h-9"
                    aria-label="Hapus baris"
                    title="Hapus baris"
                  >
                    ✕
                  </button>
                  <textarea
                    value={r.notes}
                    onChange={(e) => patchRow(r.id, { notes: e.target.value })}
                    rows={2}
                    className="col-span-2 rounded-lg border border-slate-300 px-2 py-1 text-sm md:col-span-5"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={addRow}
              className="mb-6 h-11 rounded-lg border border-cyan-600 px-3 text-sm font-medium text-cyan-700 hover:bg-cyan-50 md:h-auto md:py-1.5"
            >
              + Tambah baris
            </button>

            {/* Script (always derived from the table above) */}
            <div className="contents md:mb-2 md:flex md:items-center md:justify-between">
              <div className="mb-2 text-sm font-semibold text-slate-700 md:mb-0">
                Script — otomatis mengikuti tabel; paste ke DevTools Console di sales.sahaibat.com/timesheet
              </div>
              <div className="sticky top-0 z-10 -mx-3 mb-2 flex gap-2 bg-[#f7f8fa] px-3 py-2 md:static md:mx-0 md:mb-0 md:bg-transparent md:p-0">
                <button
                  onClick={copyScript}
                  className="h-11 flex-1 rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-cyan-700 md:h-auto md:flex-none md:font-medium"
                >
                  {copied ? "Tersalin ✓" : "Copy script"}
                </button>
                <label className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input type="checkbox" checked={apply} onChange={(e) => setApply(e.target.checked)} className="h-4 w-4" />
                  APPLY = {String(apply)} {apply ? "(langsung isi draft)" : "(dry run)"}
                </label>
              </div>
            </div>
            {copyError && (
              <div className="mb-2 text-xs text-amber-600">
                Tidak bisa copy otomatis di browser ini — teksnya sudah ke-select di bawah, tekan Ctrl+C (atau Cmd+C) manual.
              </div>
            )}
            <textarea
              ref={scriptRef}
              value={script}
              readOnly
              spellCheck={false}
              rows={18}
              className="w-full rounded-xl border border-slate-300 bg-slate-900 p-3 font-mono text-xs text-slate-100"
            />
          </>
        )}
      </div>
    </div>
  );
}
