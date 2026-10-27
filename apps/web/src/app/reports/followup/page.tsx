"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AppSidebar from "@/app/components/AppSidebar";
import ReportsTabs from "../ReportsTabs";
import { AppointmentBox, NotesEditor, type Appt, type Note } from "../followupParts";

type Priority = "hot" | "positive" | "warm" | "try" | "closed";
type Scope = "date" | "waiting";

interface Item {
  id: string;
  name: string;
  phone: string | null;
  nIn: number;
  nOut: number;
  lastInAt: string | null;
  lastOutAt: string | null;
  lastAt: string | null;
  lastInBody: string | null;
  lastOutBody: string | null;
  pitchAt: string | null;
  repliesAfterPitch: number;
  weTheLast: boolean;
  summary: { date: string; summary: string } | null;
  priority: Priority;
  isAuto: boolean;
  action: string | null;
  notes: Note[];
  appointments: Appt[];
  importantSection: string | null;
  dueDate: string | null;
  status: string;
  snoozeUntil: string | null;
  source: string;
}

interface Msg {
  id: string;
  direction: "inbound" | "outbound";
  body: string | null;
  messageType: string;
  sentAt: string;
}

const PRIORITY: Record<Priority, { label: string; short: string; color: string; desc: string; key: string }> = {
  hot: { label: "FU Secepatnya", short: "Prioritas", color: "#dc2626", desc: "Menanggapi positif dan terbuka — follow up secepatnya", key: "1" },
  positive: { label: "Positif", short: "Positif", color: "#059669", desc: "Menanggapi positif, belum mendesak", key: "5" },
  warm: { label: "Terbuka, belum antusias", short: "Terbuka", color: "#d97706", desc: "Masih terbuka tapi belum antusias — follow up santai", key: "2" },
  try: { label: "Coba sekali lagi", short: "Coba lagi", color: "#2563eb", desc: "Tidak menjawab — iseng chat sekali lagi", key: "3" },
  closed: { label: "Tutup", short: "Tutup", color: "#64748b", desc: "Menolak / di luar target — tidak perlu follow up", key: "4" },
};
const PRIORITIES: Priority[] = ["hot", "positive", "warm", "try", "closed"];

const WIB = "Asia/Jakarta";
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { timeZone: WIB, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("sv", { timeZone: WIB });
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { timeZone: WIB, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { timeZone: WIB, hour: "2-digit", minute: "2-digit" });
const wibToday = () => new Date().toLocaleDateString("sv", { timeZone: WIB });
const shiftDate = (d: string, days: number) => {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
};
const fmtDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("id-ID", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

// Pins ("FU hari ini") live in this browser only and expire at the end of the WIB day they were set.
const PIN_KEY = "followup-pins";
function readPins(day: string): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PIN_KEY) ?? "null");
    return raw && raw.day === day && Array.isArray(raw.ids) ? raw.ids : [];
  } catch {
    return [];
  }
}
function writePins(day: string, ids: string[]) {
  try {
    localStorage.setItem(PIN_KEY, JSON.stringify({ day, ids }));
  } catch {
    /* storage unavailable: pins last for this page view only */
  }
}

function ago(iso: string | null, now: number): string {
  if (!iso) return "—";
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} mnt lalu`;
  if (mins < 1440) return `${Math.round(mins / 60)} jam lalu`;
  return `${Math.floor(mins / 1440)} hari lalu`;
}

export default function FollowupPage() {
  const [scope, setScope] = useState<Scope>("date");
  const [date, setDate] = useState(() => shiftDate(wibToday(), -1));
  const [items, setItems] = useState<Item[] | null>(null);
  const [today, setToday] = useState(wibToday());
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Priority>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pins, setPins] = useState<string[]>([]);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    void Promise.resolve().then(() => setPins(readPins(wibToday())));
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const togglePin = useCallback((id: string) => {
    setPins((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      writePins(wibToday(), next);
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const qs = scope === "waiting" ? "scope=waiting" : `scope=date&date=${date}`;
      const res = await fetch(`/api/reports/followup?${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setToday(data.today ?? wibToday());
      setNow(Date.now());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [scope, date]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setItems(null);
      return load();
    });
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  const counts = useMemo(() => {
    const c: Record<Priority, number> = { hot: 0, positive: 0, warm: 0, try: 0, closed: 0 };
    for (const it of items ?? []) c[it.priority]++;
    return c;
  }, [items]);

  const stats = useMemo(() => {
    const all = items ?? [];
    const replied = all.filter((i) => i.repliesAfterPitch > 0).length;
    return { total: all.length, replied, none: all.length - replied, todo: all.filter((i) => i.priority !== "closed" && i.status !== "done").length };
  }, [items]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = (items ?? []).filter((it) => {
      if (filter !== "all" && it.priority !== filter) return false;
      if (needle && !`${it.name} ${it.phone ?? ""} ${it.action ?? ""} ${it.summary?.summary ?? ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    // Pinned leads first (most recently pinned on top); the rest keep the server order.
    const rank = (id: string) => {
      const i = pins.indexOf(id);
      return i < 0 ? Infinity : i;
    };
    return list.map((it, i) => ({ it, i })).sort((a, b) => rank(a.it.id) - rank(b.it.id) || a.i - b.i).map((x) => x.it);
  }, [items, filter, q, pins]);

  const current = visible.find((it) => it.id === selected) ?? null;

  const patch = useCallback(
    async (item: Item, body: Record<string, unknown>, okText: string) => {
      if (busy) return;
      setBusy(true);
      try {
        const res = await fetch(`/api/reports/followup/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setToast(typeof err.error === "string" ? err.error : `Gagal menyimpan (HTTP ${res.status})`);
          return;
        }
        setToast(`${item.name}: ${okText}`);
        await load();
      } finally {
        setBusy(false);
      }
    },
    [busy, load],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = visible.findIndex((it) => it.id === selected);
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        const n = visible[Math.min(visible.length - 1, idx + 1)];
        if (n) setSelected(n.id);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        const n = visible[Math.max(0, idx - 1)];
        if (n) setSelected(n.id);
      } else if (e.key === "Escape") {
        setSelected(null);
      } else if (current) {
        const p = PRIORITIES.find((x) => PRIORITY[x].key === e.key);
        if (p) {
          e.preventDefault();
          void patch(current, { priority: p }, `→ ${PRIORITY[p].label}`);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, selected, current, patch]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="reports" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3 pb-0 md:p-6 md:pb-0">
        <h1 className="mb-1 text-lg font-bold text-slate-900">Follow Up</h1>
        <p className="mb-3 text-sm text-slate-500">
          Lead yang baru di-approach dan siapa yang perlu di-follow up. Prioritas dinilai dari isi balasan setelah pitch (ditulis sesi Claude, bisa kamu ubah). Pintasan:{" "}
          <kbd className="rounded border px-1">j</kbd>/<kbd className="rounded border px-1">k</kbd> pindah baris, <kbd className="rounded border px-1">1</kbd>–
          <kbd className="rounded border px-1">4</kbd> ubah prioritas.
        </p>
        <ReportsTabs />

        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex overflow-hidden rounded-md border border-slate-200 bg-white font-semibold">
            <button className={`px-3 py-1.5 ${scope === "date" ? "bg-cyan-600 text-white" : "text-slate-600"}`} onClick={() => setScope("date")}>
              Approach per tanggal
            </button>
            <button className={`px-3 py-1.5 ${scope === "waiting" ? "bg-cyan-600 text-white" : "text-slate-600"}`} onClick={() => setScope("waiting")}>
              Semua menunggu
            </button>
          </div>
          {scope === "date" && (
            <div className="inline-flex items-center gap-1">
              <button className="rounded-md border border-slate-200 bg-white px-2 py-1.5" onClick={() => setDate(shiftDate(date, -1))} aria-label="Hari sebelumnya">
                ◀
              </button>
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1.5 outline-none focus:border-cyan-500"
              />
              <button
                className="rounded-md border border-slate-200 bg-white px-2 py-1.5 disabled:opacity-40"
                disabled={date >= today}
                onClick={() => setDate(shiftDate(date, 1))}
                aria-label="Hari berikutnya"
              >
                ▶
              </button>
            </div>
          )}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama / nomor / catatan"
            className="w-48 rounded-md border border-slate-200 bg-white px-2 py-1.5 outline-none focus:border-cyan-500"
          />
          <button className="rounded-md border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-600" onClick={() => void load()}>
            Muat ulang
          </button>
        </div>

        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Gagal memuat: {error}</div>}
        {items === null && !error && <div className="text-sm text-slate-400">Memuat…</div>}

        {items && (
          <>
            <div className="mb-2 text-sm text-slate-600">
              {scope === "date" ? <strong>{fmtDate(date)}</strong> : <strong>Semua yang masih menunggu</strong>}
              {": "}
              {stats.total} lead · {stats.replied} membalas setelah pitch · {stats.none} tanpa balasan ·{" "}
              <strong className="text-slate-900">{stats.todo} perlu follow-up</strong>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-full border px-3 py-1 font-semibold ${filter === "all" ? "border-slate-700 bg-slate-700 text-white" : "border-slate-200 bg-white text-slate-600"}`}
              >
                Semua ({items.length})
              </button>
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  title={PRIORITY[p].desc}
                  onClick={() => setFilter(filter === p ? "all" : p)}
                  className="rounded-full border px-3 py-1 font-semibold"
                  style={
                    filter === p
                      ? { background: PRIORITY[p].color, borderColor: PRIORITY[p].color, color: "#fff" }
                      : { background: "#fff", borderColor: `${PRIORITY[p].color}66`, color: PRIORITY[p].color }
                  }
                >
                  {PRIORITY[p].label} ({counts[p]})
                </button>
              ))}
            </div>

            <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_440px]">
              <div className="min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                {visible.length === 0 && (
                  <div className="p-6 text-center text-sm text-slate-400">
                    {scope === "date" ? "Tidak ada lead baru pada tanggal ini." : "Belum ada lead yang menunggu follow-up."}
                  </div>
                )}
                <ul className="divide-y divide-slate-100">
                  {visible.map((it) => {
                    const p = PRIORITY[it.priority];
                    const overdue = it.dueDate && it.dueDate < today && it.status !== "done";
                    const pinned = pins.includes(it.id);
                    return (
                      <li key={it.id}>
                        <button
                          onClick={() => setSelected(it.id)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setMenu({ id: it.id, x: e.clientX, y: e.clientY });
                          }}
                          className={`block w-full px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${pinned ? "border-l-4 border-amber-400 bg-amber-50/60" : ""} ${selected === it.id ? "bg-cyan-50" : ""}`}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="shrink-0 rounded px-1.5 py-px text-[10px] font-bold" style={{ background: `${p.color}1f`, color: p.color }}>
                                {p.short}
                                {it.isAuto ? " (auto)" : ""}
                              </span>
                              {pinned && <span title="Di-pin: FU hari ini">📌</span>}
                              <span className="truncate text-sm font-semibold">{it.name}</span>
                            </div>
                            <div className="shrink-0 text-[11px] text-slate-400">{ago(it.lastAt, now)}</div>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400">
                            <span>{it.phone ?? "tanpa nomor"}</span>
                            <span>{it.pitchAt ? `pitch ${fmtTime(it.pitchAt)}` : "belum di-pitch"}</span>
                            <span>
                              masuk {it.nIn} · keluar {it.nOut}
                            </span>
                            {it.status === "done" && <span className="font-semibold text-emerald-600">sudah di-FU</span>}
                            {it.status === "snoozed" && it.snoozeUntil && <span className="font-semibold text-slate-500">ditunda s/d {fmtDate(it.snoozeUntil)}</span>}
                            {it.dueDate && it.status !== "done" && (
                              <span className={`font-semibold ${overdue ? "text-red-600" : "text-slate-500"}`}>FU {overdue ? "lewat: " : ""}{fmtDate(it.dueDate)}</span>
                            )}
                          </div>
                          {(() => {
                            const open = it.notes.filter((n) => !n.done);
                            const first = open[0]?.text ?? it.action;
                            const nextAppt = it.appointments.find((a) => a.status === "scheduled" && new Date(a.startsAt).getTime() >= now);
                            return (
                              <>
                                {nextAppt && (
                                  <div className="mt-1 text-xs font-semibold text-violet-700">
                                    📅 {nextAppt.kind === "demo_gmeet" ? "Gmeet" : "Appointment"} {fmtTime(nextAppt.startsAt)}
                                  </div>
                                )}
                                {first && (
                                  <div className="mt-1 text-xs font-semibold text-slate-700">
                                    ➜ {first}
                                    {open.length > 1 && <span className="ml-1 font-normal text-slate-400">+{open.length - 1} poin lain</span>}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          {it.summary ? (
                            <div className="mt-0.5 text-xs text-slate-500">{it.summary.summary}</div>
                          ) : it.lastInBody ? (
                            <div className="mt-0.5 truncate text-xs text-slate-500">
                              <span className="mr-1 font-semibold text-emerald-700">Mereka:</span>
                              {it.lastInBody}
                            </div>
                          ) : (
                            <div className="mt-0.5 text-xs italic text-slate-400">Belum ada balasan sama sekali.</div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Preview: side panel on md+, full-screen sheet on phones */}
              <div className={`${current ? "fixed inset-0 z-40 flex" : "hidden"} min-h-0 flex-col bg-white md:static md:z-auto md:flex md:rounded-xl md:border md:border-slate-200`}>
                {current ? (
                  <Preview
                    key={current.id}
                    item={current}
                    busy={busy}
                    onClose={() => setSelected(null)}
                    onPatch={(body, okText) => void patch(current, body, okText)}
                    onReload={() => void load()}
                  />
                ) : (
                  <div className="m-auto p-6 text-center text-sm text-slate-400">Pilih lead di kiri untuk melihat riwayat chat.</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {menu && (
        <div
          role="menu"
          className="fixed z-50 min-w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
          style={{ left: Math.min(menu.x, typeof window !== "undefined" ? window.innerWidth - 190 : menu.x), top: menu.y }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left hover:bg-slate-100"
            onClick={() => {
              togglePin(menu.id);
              setMenu(null);
            }}
          >
            {pins.includes(menu.id) ? "📌 Lepas pin" : "📌 Pin ke atas (FU hari ini)"}
          </button>
          {pins.length > 0 && (
            <button
              role="menuitem"
              className="block w-full px-3 py-1.5 text-left text-slate-500 hover:bg-slate-100"
              onClick={() => {
                setPins([]);
                writePins(wibToday(), []);
                setMenu(null);
              }}
            >
              Lepas semua pin ({pins.length})
            </button>
          )}
        </div>
      )}
      {toast && <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}

function Preview({
  item,
  busy,
  onClose,
  onPatch,
  onReload,
}: {
  item: Item;
  busy: boolean;
  onClose: () => void;
  onPatch: (body: Record<string, unknown>, okText: string) => void;
  onReload: () => void;
}) {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [due, setDue] = useState(item.dueDate ?? "");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/leads/${item.id}/messages`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setMsgs(data.messages ?? []);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs]);

  let prevDay = "";
  return (
    <>
      <div className="max-h-[58%] shrink-0 overflow-y-auto border-b border-slate-100 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{item.name}</div>
            <div className="text-xs text-slate-400">
              {item.phone ?? "tanpa nomor"}
              {item.pitchAt ? ` · pitch ${fmtTime(item.pitchAt)}, ${item.repliesAfterPitch} balasan sesudahnya` : " · belum di-pitch"}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs">
            <Link href={`/chat?leadId=${item.id}`} target="_blank" className="font-semibold text-cyan-700 underline">
              Buka di Chat
            </Link>
            <button onClick={onClose} className="rounded-md border border-slate-200 px-2 py-1 font-medium text-slate-500 md:hidden">
              Tutup
            </button>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              disabled={busy}
              title={PRIORITY[p].desc}
              onClick={() => onPatch({ priority: p }, `→ ${PRIORITY[p].label}`)}
              className="flex min-h-9 items-center gap-1.5 rounded-md border px-2 py-1 text-left text-xs font-semibold transition-colors hover:bg-slate-50 disabled:opacity-40"
              style={
                item.priority === p && !item.isAuto
                  ? { background: PRIORITY[p].color, borderColor: PRIORITY[p].color, color: "#fff" }
                  : { borderColor: `${PRIORITY[p].color}66`, color: PRIORITY[p].color }
              }
            >
              <kbd className="rounded bg-slate-100 px-1 text-[10px] text-slate-500">{PRIORITY[p].key}</kbd>
              {PRIORITY[p].label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <button
            disabled={busy}
            onClick={() => onPatch({ status: "done" }, "ditandai sudah di-follow up")}
            className="rounded-md bg-emerald-600 px-3 py-1.5 font-semibold text-white disabled:opacity-40"
          >
            Sudah di-FU
          </button>
          <button
            disabled={busy}
            onClick={() => onPatch({ snoozeDays: 2 }, "ditunda 2 hari")}
            className="rounded-md border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
          >
            Tunda 2 hari
          </button>
          {item.status !== "open" && (
            <button
              disabled={busy}
              onClick={() => onPatch({ status: "open" }, "dibuka kembali")}
              className="rounded-md border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
            >
              Buka lagi
            </button>
          )}
        </div>

        <div className="mt-3">
          <div className="mb-1 text-[11px] font-bold tracking-wide text-slate-500 uppercase">Catatan / pengingat</div>
          <NotesEditor notes={item.notes} busy={busy} onSave={(next) => onPatch({ notes: next }, "catatan disimpan")} />
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-slate-500">FU tanggal</span>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              onBlur={() => (due || null) !== item.dueDate && onPatch({ dueDate: due || null }, "tanggal FU disimpan")}
              className="rounded-md border border-slate-200 px-2 py-1 outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 text-[11px] font-bold tracking-wide text-slate-500 uppercase">Appointment</div>
          <AppointmentBox leadId={item.id} appointments={item.appointments} onChanged={onReload} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#efeae2] p-3">
        {msgs === null && !err && <div className="text-center text-xs text-slate-500">Memuat riwayat…</div>}
        {err && <div className="text-center text-xs text-red-600">Gagal memuat chat: {err}</div>}
        {msgs && msgs.length === 0 && <div className="text-center text-xs text-slate-500">Belum ada pesan.</div>}
        {msgs?.map((m) => {
          const day = dayKey(m.sentAt);
          const showDay = day !== prevDay;
          prevDay = day;
          const out = m.direction === "outbound";
          return (
            <div key={m.id}>
              {showDay && (
                <div className="my-2 text-center">
                  <span className="rounded-full bg-white/80 px-3 py-0.5 text-[11px] text-slate-500">{dayLabel(m.sentAt)}</span>
                </div>
              )}
              <div className={`mb-1 flex ${out ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[13px] shadow-sm ${out ? "bg-[#d9fdd3]" : "bg-white"}`}>
                  <div className="break-words whitespace-pre-wrap">
                    {m.body && m.body.trim() ? m.body : <em className="text-slate-400">[{m.messageType === "text" ? "pesan tanpa teks" : m.messageType}]</em>}
                  </div>
                  <div className="mt-0.5 text-right text-[10px] text-slate-400" title={fmtTime(m.sentAt)}>
                    {hhmm(m.sentAt)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </>
  );
}
