"use client";

import { useState } from "react";

export interface Note {
  id: string;
  text: string;
  done: boolean;
  /** Set by the server when the point is first saved / checked. */
  createdAt?: string;
  doneAt?: string | null;
}

export interface NoteLog {
  id: string;
  noteId: string;
  action: string;
  text: string;
  at: string;
}

export interface Appt {
  id: string;
  kind: string;
  startsAt: string;
  status: string;
  location: string | null;
  note: string | null;
}

const WIB = "Asia/Jakarta";
export const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { timeZone: WIB, weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export const fmtShort = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { timeZone: WIB, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()));

/**
 * Bullet-point reminders for one lead. Toggle / delete / add save immediately,
 * a text edit saves when the field loses focus. `onSave` receives the full list.
 */
export function NotesEditor({ notes, busy, onSave, placeholder }: { notes: Note[]; busy: boolean; onSave: (next: Note[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});

  const commit = (next: Note[]) => onSave(next);
  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    commit([...notes, { id: newId(), text, done: false }]);
  };

  return (
    <div className="grid gap-1 text-xs">
      {notes.length === 0 && <div className="text-slate-400">Belum ada poin pengingat.</div>}
      {notes.map((n) => (
        <div key={n.id} className="flex items-start gap-1.5">
          <input
            type="checkbox"
            checked={n.done}
            disabled={busy}
            onChange={() => commit(notes.map((x) => (x.id === n.id ? { ...x, done: !x.done } : x)))}
            className="mt-1.5 h-3.5 w-3.5 shrink-0 accent-emerald-600"
            aria-label="Tandai selesai"
          />
          <textarea
            rows={1}
            value={edits[n.id] ?? n.text}
            disabled={busy}
            onChange={(e) => setEdits((p) => ({ ...p, [n.id]: e.target.value }))}
            onBlur={() => {
              const v = edits[n.id];
              if (v === undefined) return;
              setEdits((p) => {
                const { [n.id]: _drop, ...rest } = p;
                void _drop;
                return rest;
              });
              if (v.trim() !== n.text) commit(notes.map((x) => (x.id === n.id ? { ...x, text: v.trim() } : x)));
            }}
            className={`min-h-7 w-full resize-none rounded-md border border-transparent bg-transparent px-1.5 py-1 leading-snug outline-none hover:border-slate-200 focus:border-cyan-500 focus:bg-white ${
              n.done ? "text-slate-400 line-through" : "text-slate-700"
            }`}
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          {(n.createdAt || n.doneAt) && (
            <span className="mt-1.5 shrink-0 text-right text-[10px] leading-tight whitespace-nowrap text-slate-400">
              {n.createdAt && <span className="block">+ {fmtShort(n.createdAt)}</span>}
              {n.done && n.doneAt && <span className="block font-semibold text-emerald-600">✓ {fmtShort(n.doneAt)}</span>}
            </span>
          )}
          <button
            disabled={busy}
            onClick={() => commit(notes.filter((x) => x.id !== n.id))}
            className="mt-0.5 shrink-0 rounded px-1.5 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
            aria-label="Hapus poin"
            title="Hapus poin"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <input
          value={draft}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder ?? "Tambah poin pengingat, tekan Enter"}
          className="w-full rounded-md border border-slate-200 px-2 py-1.5 outline-none focus:border-cyan-500"
        />
        <button disabled={busy || !draft.trim()} onClick={add} className="shrink-0 rounded-md bg-cyan-600 px-3 py-1.5 font-semibold text-white disabled:opacity-40">
          + Poin
        </button>
      </div>
    </div>
  );
}

const LOG_LABEL: Record<string, { text: string; cls: string }> = {
  added: { text: "ditambah", cls: "text-cyan-700" },
  done: { text: "dicentang", cls: "text-emerald-700" },
  undone: { text: "batal centang", cls: "text-amber-700" },
  edited: { text: "diubah", cls: "text-slate-600" },
  deleted: { text: "dihapus", cls: "text-red-600" },
};

/** Change history of a lead's reminder points, newest first. */
export function NoteLogList({ log }: { log: NoteLog[] }) {
  if (log.length === 0) return <div className="text-xs text-slate-400">Belum ada riwayat pengingat.</div>;
  return (
    <ul className="grid gap-0.5 text-xs">
      {log.map((g) => {
        const l = LOG_LABEL[g.action] ?? { text: g.action, cls: "text-slate-600" };
        return (
          <li key={g.id} className="flex gap-2">
            <span className="w-28 shrink-0 text-slate-400 tabular-nums">{fmtShort(g.at)}</span>
            <span className={`w-24 shrink-0 font-semibold ${l.cls}`}>{l.text}</span>
            <span className="min-w-0 text-slate-700">{g.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

const KIND_LABEL: Record<string, string> = { demo_gmeet: "Gmeet", visit: "Kunjungan", other: "Lainnya" };
export const kindLabel = (k: string) => KIND_LABEL[k] ?? k;

/** Existing appointments of a lead plus a small form to book one (reuses POST /api/schedule/appointments). */
export function AppointmentBox({ leadId, appointments, onChanged }: { leadId: string; appointments: Appt[]; onChanged: () => void }) {
  const [kind, setKind] = useState("demo_gmeet");
  const [when, setWhen] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!when) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/schedule/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, kind, startsAt: new Date(when).toISOString(), location: link.trim() || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setWhen("");
      setLink("");
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: "done" | "cancelled" | "scheduled") {
    setBusy(true);
    try {
      await fetch(`/api/schedule/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-1.5 text-xs">
      {appointments.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-violet-50 px-2 py-1.5">
          <span className="font-semibold text-violet-800">
            {kindLabel(a.kind)} · {fmtWhen(a.startsAt)}
          </span>
          <span className="text-slate-500">{a.status === "done" ? "selesai" : a.status === "scheduled" ? "terjadwal" : a.status}</span>
          <span className="ml-auto flex gap-2">
            {a.status !== "done" && (
              <button disabled={busy} className="font-semibold text-emerald-700 underline disabled:opacity-40" onClick={() => void setStatus(a.id, "done")}>
                Selesai
              </button>
            )}
            <button disabled={busy} className="font-semibold text-red-600 underline disabled:opacity-40" onClick={() => void setStatus(a.id, "cancelled")}>
              Batal
            </button>
          </span>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-1.5">
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
          <option value="demo_gmeet">Appointment Gmeet</option>
          <option value="visit">Kunjungan</option>
          <option value="other">Lainnya</option>
        </select>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="rounded-md border border-slate-200 px-2 py-1 outline-none focus:border-cyan-500"
          aria-label="Waktu janjian"
        />
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link Meet (opsional)"
          className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1.5 outline-none focus:border-cyan-500"
        />
        <button disabled={busy || !when} onClick={() => void save()} className="rounded-md bg-violet-600 px-3 py-1.5 font-semibold text-white disabled:opacity-40">
          Simpan janji
        </button>
      </div>
      {err && <div className="text-red-600">Gagal menyimpan janji: {err}</div>}
    </div>
  );
}
