"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AppSidebar from "@/app/components/AppSidebar";
import ReportsTabs from "../ReportsTabs";
import { CATEGORY_COLORS, CATEGORY_LABELS, type LeadCategory } from "@/lib/leadSegmentation";

type PitchStatus = "no_answer" | "answering" | "not_pitched";
type Pattern = "no_messages" | "out_only" | "we_last" | "they_last_marked";

interface Item {
  id: string;
  name: string;
  phone: string | null;
  stage: string;
  stageColor: string;
  nIn: number;
  nOut: number;
  lastInAt: string | null;
  lastOutAt: string | null;
  lastAt: string | null;
  lastInBody: string | null;
  lastOutBody: string | null;
  pattern: Pattern;
  marked: boolean;
  pitchStatus: PitchStatus;
  lastPitchAt: string | null;
  repliesAfterPitch: number;
}

interface Msg {
  id: string;
  direction: "inbound" | "outbound";
  body: string | null;
  messageType: string;
  sentAt: string;
}

// The same tag actions /reports/kanban uses (PATCH /api/leads/[id]/quick-tag).
// "Not-Interested" and "Non-Responsive" are automatic categories, not tags.
const DECISIONS: { key: string; action: string; category: LeadCategory; hint: string }[] = [
  { key: "1", action: "needsFollowUp", category: "needs_follow_up", hint: "Masih potensial, perlu di-follow up" },
  { key: "2", action: "needsOtherContact", category: "needs_other_contact", hint: "Perlu kontak lain / PIC lain" },
  { key: "3", action: "declined", category: "declined", hint: "Sudah menolak" },
  { key: "4", action: "appointment", category: "appointment", hint: "Sudah ada jadwal / appointment" },
  { key: "5", action: "repliedBot", category: "replied_by_bot", hint: "Yang membalas hanya bot" },
  { key: "6", action: "noWaAccount", category: "no_wa_account", hint: "Nomor tidak punya WhatsApp" },
];

const PATTERN_LABEL: Record<Pattern, string> = {
  no_messages: "Belum ada pesan",
  out_only: "Hanya kita yang chat",
  we_last: "Pernah membalas — kita terakhir",
  they_last_marked: "Mereka terakhir (ditandai sudah dibalas)",
};

// Derived labels (not stored): based on the intro message "Perkenalkan saya Dzaki Wismadi …".
const PITCH: Record<PitchStatus, { label: string; color: string; desc: string }> = {
  no_answer: { label: "Pitch - Tidak Menjawab", color: "#dc2626", desc: "Sudah di-pitch, tidak ada balasan sejak pitch terakhir" },
  answering: { label: "Pitch - Masih Menjawab", color: "#059669", desc: "Ada balasan setelah pitch terakhir" },
  not_pitched: { label: "Belum Di-pitch", color: "#64748b", desc: "Belum ada pesan pitch terkirim" },
};

const WIB = "Asia/Jakarta";
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { timeZone: WIB, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("sv", { timeZone: WIB });
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { timeZone: WIB, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { timeZone: WIB, hour: "2-digit", minute: "2-digit" });

function ago(iso: string | null, now: number): string {
  if (!iso) return "—";
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} mnt lalu`;
  if (mins < 1440) return `${Math.round(mins / 60)} jam lalu`;
  return `${Math.floor(mins / 1440)} hari lalu`;
}
const ageDays = (iso: string | null, now: number) => (iso ? (now - new Date(iso).getTime()) / 86400000 : Infinity);

export default function ClassifyPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pitchF, setPitchF] = useState<"all" | PitchStatus>("all");
  const [pattern, setPattern] = useState<"all" | Pattern>("all");
  const [age, setAge] = useState<"all" | "lt2" | "2to7" | "gt7">("all");
  const [q, setQ] = useState("");
  const [oldestFirst, setOldestFirst] = useState(false);
  const [toast, setToast] = useState<{ text: string; undoId?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/classify");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setNow(Date.now());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const visible = useMemo(() => {
    if (!items) return [];
    const needle = q.trim().toLowerCase();
    const out = items.filter((it) => {
      if (pattern !== "all" && it.pattern !== pattern) return false;
      if (pitchF !== "all" && it.pitchStatus !== pitchF) return false;
      if (age !== "all") {
        const d = ageDays(it.lastAt, now);
        if (age === "lt2" && !(d < 2)) return false;
        if (age === "2to7" && !(d >= 2 && d < 7)) return false;
        if (age === "gt7" && !(d >= 7)) return false;
      }
      if (needle && !`${it.name} ${it.phone ?? ""} ${PITCH[it.pitchStatus].label}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    if (oldestFirst) out.reverse();
    return out;
  }, [items, pattern, pitchF, age, q, oldestFirst, now]);

  const pitchCounts = useMemo(() => {
    const c: Record<PitchStatus, number> = { no_answer: 0, answering: 0, not_pitched: 0 };
    for (const it of items ?? []) c[it.pitchStatus]++;
    return c;
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<Pattern, number> = { no_messages: 0, out_only: 0, we_last: 0, they_last_marked: 0 };
    for (const it of items ?? []) c[it.pattern]++;
    return c;
  }, [items]);

  const current = visible.find((it) => it.id === selected) ?? null;

  const decide = useCallback(
    async (item: Item, d: (typeof DECISIONS)[number]) => {
      if (busy) return;
      setBusy(true);
      try {
        const res = await fetch(`/api/leads/${item.id}/quick-tag`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: d.action }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setToast({ text: typeof err.error === "string" ? err.error : `Gagal menyimpan (HTTP ${res.status})` });
          return;
        }
        // Move the cursor to the next row before the current one disappears.
        const idx = visible.findIndex((it) => it.id === item.id);
        const next = visible[idx + 1] ?? visible[idx - 1] ?? null;
        setItems((prev) => (prev ? prev.filter((it) => it.id !== item.id) : prev));
        setSelected(next ? next.id : null);
        setToast({
          text: `${item.name} → ${CATEGORY_LABELS[d.category]}`,
          // "clear" would also wipe a manual "sudah dibalas" mark, so only offer undo when there is none.
          undoId: item.marked ? undefined : item.id,
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, visible],
  );

  async function undo(leadId: string) {
    const res = await fetch(`/api/leads/${leadId}/quick-tag`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear" }),
    });
    setToast({ text: res.ok ? "Dikembalikan ke Perlu Diklasifikasi" : "Gagal mengurungkan" });
    await load();
  }

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(id);
  }, [toast]);

  // Keyboard: j/k or arrows to move, 1-6 to decide, Esc to close the preview.
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
        const d = DECISIONS.find((x) => x.key === e.key);
        if (d) {
          e.preventDefault();
          void decide(current, d);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, selected, current, decide]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="reports" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3 pb-0 md:p-6 md:pb-0">
        <h1 className="mb-1 text-lg font-bold text-slate-900">Klasifikasi Lead</h1>
        <p className="mb-3 text-sm text-slate-500">
          Lead berstatus <strong>Perlu Diklasifikasi</strong>. Klik baris untuk melihat riwayat chat di panel kanan lalu tentukan kategorinya.
          Pintasan: <kbd className="rounded border px-1">j</kbd>/<kbd className="rounded border px-1">k</kbd> pindah baris,{" "}
          <kbd className="rounded border px-1">1</kbd>–<kbd className="rounded border px-1">6</kbd> pilih kategori.
        </p>
        <ReportsTabs />

        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Gagal memuat: {error}</div>}
        {items === null && !error && <div className="text-sm text-slate-400">Memuat…</div>}

        {items && (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={() => setPitchF("all")}
                className={`rounded-full border px-3 py-1 font-semibold ${pitchF === "all" ? "border-slate-700 bg-slate-700 text-white" : "border-slate-200 bg-white text-slate-600"}`}
              >
                Semua ({items.length})
              </button>
              {(Object.keys(PITCH) as PitchStatus[]).map((k) => (
                <button
                  key={k}
                  title={PITCH[k].desc}
                  onClick={() => setPitchF(pitchF === k ? "all" : k)}
                  className="rounded-full border px-3 py-1 font-semibold"
                  style={
                    pitchF === k
                      ? { background: PITCH[k].color, borderColor: PITCH[k].color, color: "#fff" }
                      : { background: "#fff", borderColor: `${PITCH[k].color}66`, color: PITCH[k].color }
                  }
                >
                  {PITCH[k].label} ({pitchCounts[k]})
                </button>
              ))}
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700">{visible.length} dari {items.length} lead</span>
              <select value={pattern} onChange={(e) => setPattern(e.target.value as typeof pattern)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
                <option value="all">Semua pola</option>
                {(Object.keys(PATTERN_LABEL) as Pattern[]).map((p) => (
                  <option key={p} value={p}>
                    {PATTERN_LABEL[p]} ({counts[p]})
                  </option>
                ))}
              </select>
              <select value={age} onChange={(e) => setAge(e.target.value as typeof age)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
                <option value="all">Semua umur chat</option>
                <option value="lt2">Terakhir &lt; 2 hari</option>
                <option value="2to7">Terakhir 2–7 hari</option>
                <option value="gt7">Terakhir &gt; 7 hari</option>
              </select>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama / nomor / label"
                className="w-44 rounded-md border border-slate-200 bg-white px-2 py-1.5 outline-none focus:border-cyan-500"
              />
              <button className="rounded-md border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-600" onClick={() => setOldestFirst((v) => !v)}>
                {oldestFirst ? "Terlama dulu" : "Terbaru dulu"}
              </button>
              <button className="rounded-md border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-600" onClick={() => void load()}>
                Muat ulang
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_440px]">
              <div className="min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                {visible.length === 0 && <div className="p-6 text-center text-sm text-slate-400">Tidak ada lead yang cocok.</div>}
                <ul className="divide-y divide-slate-100">
                  {visible.map((it) => (
                    <li key={it.id}>
                      <button
                        onClick={() => setSelected(it.id)}
                        className={`block w-full px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${selected === it.id ? "bg-cyan-50" : ""}`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="min-w-0 truncate text-sm font-semibold">{it.name}</div>
                          <div className="shrink-0 text-[11px] text-slate-400">{ago(it.lastAt, now)}</div>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400">
                          <span>{it.phone ?? "tanpa nomor"}</span>
                          <span>
                            masuk {it.nIn} · keluar {it.nOut}
                          </span>
                          <span className="rounded px-1.5 py-px text-[10px] font-semibold" style={{ background: `${it.stageColor}22`, color: it.stageColor }}>
                            {it.stage}
                          </span>
                          <span className="rounded px-1.5 py-px text-[10px] font-semibold" style={{ background: `${PITCH[it.pitchStatus].color}1f`, color: PITCH[it.pitchStatus].color }}>
                            {PITCH[it.pitchStatus].label}
                          </span>
                          {it.marked && <span className="rounded bg-violet-100 px-1.5 py-px text-[10px] font-semibold text-violet-700">ditandai sudah dibalas</span>}
                        </div>
                        <div className="mt-1 grid gap-0.5 text-xs">
                          {it.lastInBody && (
                            <div className="truncate text-slate-700">
                              <span className="mr-1 font-semibold text-emerald-700">Mereka{it.lastInAt ? ` (${ago(it.lastInAt, now)})` : ""}:</span>
                              {it.lastInBody}
                            </div>
                          )}
                          {it.lastOutBody && (
                            <div className="truncate text-slate-500">
                              <span className="mr-1 font-semibold text-cyan-700">Kita{it.lastOutAt ? ` (${ago(it.lastOutAt, now)})` : ""}:</span>
                              {it.lastOutBody}
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Preview: side panel on md+, full-screen sheet on phones */}
              <div className={`${current ? "fixed inset-0 z-40 flex" : "hidden"} min-h-0 flex-col bg-white md:static md:z-auto md:flex md:rounded-xl md:border md:border-slate-200`}>
                {current ? (
                  <Preview item={current} onDecide={(d) => void decide(current, d)} onClose={() => setSelected(null)} busy={busy} />
                ) : (
                  <div className="m-auto p-6 text-center text-sm text-slate-400">Pilih lead di kiri untuk melihat riwayat chat.</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          <span>{toast.text}</span>
          {toast.undoId && (
            <button className="font-semibold text-cyan-300 underline" onClick={() => void undo(toast.undoId!)}>
              Urungkan
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Preview({ item, onDecide, onClose, busy }: { item: Item; onDecide: (d: (typeof DECISIONS)[number]) => void; onClose: () => void; busy: boolean }) {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setMsgs(null);
      setErr(null);
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
      <div className="border-b border-slate-100 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{item.name}</div>
            <div className="text-xs text-slate-400">
              {item.phone ?? "tanpa nomor"} · {PITCH[item.pitchStatus].label}
              {item.lastPitchAt ? ` (pitch ${fmtTime(item.lastPitchAt)}, ${item.repliesAfterPitch} balasan sesudahnya)` : ""}
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
          {DECISIONS.map((d) => (
            <button
              key={d.action}
              disabled={busy}
              title={d.hint}
              onClick={() => onDecide(d)}
              className="flex min-h-9 items-center gap-1.5 rounded-md border px-2 py-1 text-left text-xs font-semibold transition-colors hover:bg-slate-50 disabled:opacity-40"
              style={{ borderColor: `${CATEGORY_COLORS[d.category]}66`, color: CATEGORY_COLORS[d.category] }}
            >
              <kbd className="rounded bg-slate-100 px-1 text-[10px] text-slate-500">{d.key}</kbd>
              {CATEGORY_LABELS[d.category]}
            </button>
          ))}
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
