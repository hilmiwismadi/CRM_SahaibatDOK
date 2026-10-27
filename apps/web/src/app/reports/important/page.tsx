"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppSidebar from "@/app/components/AppSidebar";
import ReportsTabs from "../ReportsTabs";
import { AppointmentBox, NoteLogList, NotesEditor, fmtShort, fmtWhen, kindLabel, type Appt, type Note, type NoteLog } from "../followupParts";

interface Item {
  id: string;
  name: string;
  phone: string | null;
  section: "main" | "post_gmeet";
  isAutoPost: boolean;
  stage: string | null;
  status: string | null;
  reason: string | null;
  notes: Note[];
  noteLog: NoteLog[];
  appointments: Appt[];
  lastInAt: string | null;
  lastOutAt: string | null;
  lastAt: string | null;
  weTheLast: boolean;
  lastInBody: string | null;
  lastOutBody: string | null;
  summary: { date: string; summary: string } | null;
}

interface Upcoming {
  id: string;
  leadId: string;
  name: string;
  kind: string;
  startsAt: string;
  location: string | null;
}

const STAGES = ["Sudah diberikan akses trial dan mencoba", "Persiapan akun trial", "Permintaan detail untuk setup akun", "Demo selesai, menunggu keputusan"];

function ago(iso: string | null, now: number): { text: string; days: number } {
  if (!iso) return { text: "belum pernah chat", days: Infinity };
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 60) return { text: `${mins} mnt lalu`, days: 0 };
  if (mins < 1440) return { text: `${Math.round(mins / 60)} jam lalu`, days: 0 };
  const d = Math.floor(mins / 1440);
  return { text: `${d} hari lalu`, days: d };
}

export default function ImportantPage() {
  const [main, setMain] = useState<Item[] | null>(null);
  const [post, setPost] = useState<Item[]>([]);
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/important");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMain(data.main ?? []);
      setPost(data.postGmeet ?? []);
      setUpcoming(data.upcoming ?? []);
      setNow(Date.now());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  const patch = useCallback(
    async (leadId: string, body: Record<string, unknown>, okText: string) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/reports/followup/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setToast(typeof err.error === "string" ? err.error : `Gagal menyimpan (HTTP ${res.status})`);
          return;
        }
        setToast(okText);
        await load();
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const stale = useMemo(() => (main ?? []).filter((i) => ago(i.lastAt, now).days >= 4).length, [main, now]);
  const noReason = useMemo(() => post.filter((i) => !i.reason?.trim()).length, [post]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="reports" />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-3 pb-10 md:p-6">
        <h1 className="mb-1 text-lg font-bold text-slate-900">Lead Penting</h1>
        <p className="mb-3 text-sm text-slate-500">
          Lead yang sudah demo atau sedang disiapkan akunnya. Yang paling lama tidak di-chat muncul paling atas supaya tidak terlewat.
        </p>
        <ReportsTabs />

        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Gagal memuat: {error}</div>}
        {main === null && !error && <div className="text-sm text-slate-400">Memuat…</div>}

        {main && (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-slate-700 px-3 py-1 font-semibold text-white">Utama {main.length}</span>
              <span className={`rounded-full px-3 py-1 font-semibold ${stale ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                {stale} utama ≥ 4 hari tanpa chat
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">Post Gmeet {post.length}</span>
              <span className={`rounded-full px-3 py-1 font-semibold ${noReason ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
                {noReason} belum ada alasan
              </span>
              <button className="ml-auto rounded-md border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-600" onClick={() => void load()}>
                Muat ulang
              </button>
            </div>

            {upcoming.length > 0 && (
              <section className="mb-5">
                <h2 className="mb-1.5 text-sm font-bold text-violet-800">📅 Janji mendatang</h2>
                <div className="flex flex-wrap gap-2">
                  {upcoming.map((u) => (
                    <Link
                      key={u.id}
                      href={`/chat?leadId=${u.leadId}`}
                      target="_blank"
                      className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs text-violet-900 hover:bg-violet-100"
                    >
                      <span className="font-semibold">{fmtWhen(u.startsAt)}</span> · {kindLabel(u.kind)} · {u.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="mb-6">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900">Utama — setelah demo ada lanjutan</h2>
                <AddLead onPick={(id, name) => void patch(id, { importantSection: "main" }, `${name} ditambahkan ke Utama`)} />
              </div>
              {main.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">Belum ada lead utama. Tambahkan lewat pencarian di kanan atas.</div>}
              {main.length > 0 && (
                <TableShell minWidth={1040} cols={["Lead & tahap", "Status terkini", "Gmeet / kunjungan", "Chat terakhir", "Pengingat", ""]} widths={["17%", "22%", "10%", "14%", "29%", "8%"]}>
                  {main.map((it) => (
                    <MainRow key={it.id} it={it} now={now} busy={busy} onPatch={(b, t) => void patch(it.id, b, t)} onReload={() => void load()} />
                  ))}
                </TableShell>
              )}
            </section>

            <section>
              <h2 className="mb-1 text-sm font-bold text-slate-900">Post Gmeet — sudah demo, tapi tidak ada lanjutan</h2>
              <p className="mb-2 text-xs text-slate-500">
                Semua lead yang pernah demo (Gmeet atau kunjungan) tapi belum masuk Utama. Isi alasan kenapa tidak dilanjutkan (mis. sudah punya sistem vendor, offline) supaya jelas nanti.
              </p>
              {post.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">Belum ada.</div>}
              {post.length > 0 && (
                <TableShell minWidth={960} cols={["Lead", "Gmeet / kunjungan", "Chat terakhir & ringkasan", "Kenapa tidak dilanjutkan?", ""]} widths={["18%", "12%", "34%", "28%", "8%"]}>
                  {post.map((it) => (
                    <PostRow key={it.id} it={it} now={now} busy={busy} onPatch={(b, t) => void patch(it.id, b, t)} onReload={() => void load()} />
                  ))}
                </TableShell>
              )}
            </section>
          </>
        )}
      </div>
      {toast && <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}

function TableShell({ cols, widths, minWidth, children }: { cols: string[]; widths: string[]; minWidth: number; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full table-fixed border-collapse text-xs" style={{ minWidth }}>
        <colgroup>
          {widths.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead className="bg-slate-50 text-left text-[11px] font-bold tracking-wide text-slate-500 uppercase">
          <tr>
            {cols.map((c, i) => (
              <th key={i} className="border-b border-slate-200 px-3 py-2">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

const td = "border-b border-slate-100 px-3 py-2.5 align-top";
const inlineEdit =
  "w-full resize-none rounded-md border border-transparent bg-transparent px-1.5 py-1 leading-snug outline-none hover:border-slate-200 focus:border-cyan-500 focus:bg-white";

function LeadCell({ it }: { it: Item }) {
  return (
    <>
      <Link href={`/chat?leadId=${it.id}`} target="_blank" className="block font-bold text-slate-900 hover:underline">
        {it.name}
      </Link>
      <div className="text-[11px] text-slate-400">{it.phone ?? "tanpa nomor"}</div>
    </>
  );
}

function GmeetList({ appts, now }: { appts: Appt[]; now: number }) {
  const g = appts.filter((a) => a.kind === "demo_gmeet" || a.kind === "visit");
  if (g.length === 0) return <span className="italic text-slate-400">Belum tercatat</span>;
  return (
    <ol className="grid gap-0.5">
      {g.map((a, i) => {
        const upcoming = a.status === "scheduled" && new Date(a.startsAt).getTime() > now;
        return (
          <li key={a.id} className={upcoming ? "font-semibold text-violet-700" : "text-slate-700"}>
            <span className="text-slate-400">{i + 1}.</span> {fmtShort(a.startsAt)}
            {a.kind === "visit" && <span className="text-amber-700"> · kunjungan</span>}
            {upcoming && " (terjadwal)"}
          </li>
        );
      })}
    </ol>
  );
}

function LastChat({ it, now }: { it: Item; now: number }) {
  const a = ago(it.lastAt, now);
  const hot = a.days >= 4;
  return (
    <div>
      <span className={`inline-block rounded px-1.5 py-px font-semibold ${hot ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
        {hot && "⚠ "}
        {a.text}
      </span>
      {it.lastAt && <div className="mt-0.5 text-[11px] text-slate-500">{it.weTheLast ? "kita yang terakhir" : "mereka yang terakhir"}</div>}
      {it.lastInBody && (
        <div className="mt-1 line-clamp-2 text-slate-500" title={it.lastInBody}>
          <span className="mr-1 font-semibold text-emerald-700">Mereka:</span>
          {it.lastInBody}
        </div>
      )}
    </div>
  );
}

function MainRow({ it, now, busy, onPatch, onReload }: { it: Item; now: number; busy: boolean; onPatch: (b: Record<string, unknown>, t: string) => void; onReload: () => void }) {
  const [status, setStatus] = useState(it.status ?? "");
  const [stage, setStage] = useState(it.stage ?? "");
  const [editStage, setEditStage] = useState(false);
  const [open, setOpen] = useState<null | "log" | "appt">(null);
  const toggle = (k: "log" | "appt") => setOpen((v) => (v === k ? null : k));
  return (
    <tbody className="hover:bg-slate-50/60">
      <tr>
        <td className={td}>
          <LeadCell it={it} />
          {editStage ? (
            <>
              <input
                autoFocus
                list={`stages-${it.id}`}
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                onBlur={() => {
                  setEditStage(false);
                  if ((stage.trim() || null) !== it.stage) onPatch({ importantStage: stage.trim() || null }, "tahap disimpan");
                }}
                placeholder="Tahap…"
                className="mt-1.5 w-full rounded-md border border-emerald-400 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800 outline-none"
              />
              <datalist id={`stages-${it.id}`}>
                {STAGES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </>
          ) : (
            <button
              onClick={() => setEditStage(true)}
              title="Klik untuk ubah tahap"
              className={`mt-1.5 block w-full rounded-md border px-2 py-1 text-left text-[11px] leading-snug font-semibold ${
                stage ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-dashed border-slate-300 text-slate-400"
              }`}
            >
              {stage || "+ Tahap"}
            </button>
          )}
        </td>
        <td className={td}>
          <textarea
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            onBlur={() => (status.trim() || null) !== it.status && onPatch({ importantStatus: status.trim() || null }, "status disimpan")}
            rows={2}
            placeholder="Sudah sampai mana, apa yang masih kurang"
            className={`${inlineEdit} text-slate-700`}
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
        </td>
        <td className={td}>
          <GmeetList appts={it.appointments} now={now} />
        </td>
        <td className={td}>
          <LastChat it={it} now={now} />
        </td>
        <td className={td}>
          <NotesEditor notes={it.notes} busy={busy} onSave={(next) => onPatch({ notes: next }, "pengingat disimpan")} />
        </td>
        <td className={`${td} text-[11px]`}>
          <div className="grid justify-items-start gap-1.5">
            <button className="font-semibold text-slate-700 underline" onClick={() => toggle("log")}>
              Log ({it.noteLog.length})
            </button>
            <button className="font-semibold text-violet-700 underline" onClick={() => toggle("appt")}>
              Janji
            </button>
            <button disabled={busy} className="text-left font-semibold text-slate-500 underline disabled:opacity-40" onClick={() => onPatch({ importantSection: "post_gmeet" }, "dipindah ke Post Gmeet")}>
              → Post Gmeet
            </button>
            <button disabled={busy} className="font-semibold text-red-600 underline disabled:opacity-40" onClick={() => onPatch({ importantSection: null }, "dihapus dari Penting")}>
              Hapus
            </button>
          </div>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            {open === "log" ? (
              <>
                <div className="mb-1.5 text-[11px] font-bold tracking-wide text-slate-500 uppercase">Riwayat pengingat · {it.name}</div>
                <NoteLogList log={it.noteLog} />
              </>
            ) : (
              <AppointmentBox leadId={it.id} appointments={it.appointments} onChanged={onReload} />
            )}
          </td>
        </tr>
      )}
    </tbody>
  );
}

function PostRow({ it, now, busy, onPatch, onReload }: { it: Item; now: number; busy: boolean; onPatch: (b: Record<string, unknown>, t: string) => void; onReload: () => void }) {
  const [reason, setReason] = useState(it.reason ?? "");
  const [showAppt, setShowAppt] = useState(false);
  const missing = !it.reason?.trim();
  return (
    <tbody className="hover:bg-slate-50/60">
      <tr>
        <td className={td}>
          <LeadCell it={it} />
        </td>
        <td className={td}>
          <GmeetList appts={it.appointments} now={now} />
        </td>
        <td className={td}>
          <LastChat it={it} now={now} />
          {it.summary && (
            <div className="mt-1 text-slate-500">
              <span className="font-semibold">Ringkasan {it.summary.date}:</span> {it.summary.summary}
            </div>
          )}
        </td>
        <td className={td}>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => (reason.trim() || null) !== it.reason && onPatch({ noFollowReason: reason.trim() || null }, "alasan disimpan")}
            rows={2}
            placeholder="Belum ada alasan — mis. sudah ada sistem vendor offline, belum siap, dsb."
            className={`${inlineEdit} ${missing ? "border-amber-300 bg-amber-50" : "text-slate-700"}`}
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
        </td>
        <td className={`${td} text-[11px]`}>
          <div className="grid justify-items-start gap-1.5">
            <button disabled={busy} className="rounded-md bg-emerald-600 px-2 py-1 font-semibold text-white disabled:opacity-40" onClick={() => onPatch({ importantSection: "main" }, "dipindah ke Utama")}>
              Jadikan Utama
            </button>
            <button className="font-semibold text-violet-700 underline" onClick={() => setShowAppt((v) => !v)}>
              Janji
            </button>
          </div>
        </td>
      </tr>
      {showAppt && (
        <tr>
          <td colSpan={5} className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <AppointmentBox leadId={it.id} appointments={it.appointments} onChanged={onReload} />
          </td>
        </tr>
      )}
    </tbody>
  );
}

function AddLead({ onPick }: { onPick: (id: string, name: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/schedule/lead-search?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        if (!cancelled) setResults(data.leads ?? []);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const shown = q.trim().length >= 2 ? results : [];
  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="+ Tambah lead ke Utama (cari nama)"
        className="w-64 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-cyan-500"
      />
      {shown.length > 0 && (
        <ul className="absolute right-0 z-20 mt-1 max-h-60 w-72 overflow-y-auto rounded-md border border-slate-200 bg-white text-xs shadow-lg">
          {shown.map((r) => (
            <li key={r.id}>
              <button
                className="block w-full truncate px-3 py-2 text-left hover:bg-slate-50"
                onClick={() => {
                  onPick(r.id, r.name);
                  setQ("");
                  setResults([]);
                }}
              >
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
