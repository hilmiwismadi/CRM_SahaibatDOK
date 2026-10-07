"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { formatDate } from "@/lib/i18n/locale";
import { isUrl, parseYmd, toIso, type ItemKind, type ScheduleItem } from "./utils";

type T = ReturnType<typeof useLanguage>["t"];

export function kindLabel(t: T, kind: ItemKind): string {
  switch (kind) {
    case "followup":
      return t.schedKindFollowUp;
    case "demo_gmeet":
      return t.schedKindDemo;
    case "visit":
      return t.schedKindVisit;
    default:
      return t.schedKindOther;
  }
}

const inputCls =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500";
const labelCls = "mt-3 block text-xs font-medium text-slate-600";
const primaryBtn =
  "rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50";
const ghostBtn = "rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50";

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

async function call(url: string, method: string, body?: unknown): Promise<void> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(String(res.status));
}

// ───────────────────────── Detail / edit ─────────────────────────

export function ItemModal({
  item,
  onClose,
  onChanged,
}: {
  item: ScheduleItem;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { locale, t } = useLanguage();
  const isFollowUp = item.kind === "followup";
  const [kind, setKind] = useState<ItemKind>(item.kind);
  const [day, setDay] = useState(item.day);
  const [time, setTime] = useState(item.time ?? "");
  const [duration, setDuration] = useState(item.durationMin);
  const [location, setLocation] = useState(item.location ?? "");
  const [note, setNote] = useState(item.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(false);
    try {
      await fn();
      onChanged();
      onClose();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  function save() {
    return run(async () => {
      if (isFollowUp) {
        const url = `/api/conversations/${item.waContactId}/follow-up`;
        if (day !== item.day || (time || null) !== item.time) {
          await call(url, "PATCH", { action: "snooze", until: time ? toIso(day, time) : day });
        }
        if (note.trim() !== (item.note ?? "")) {
          await call(url, "PATCH", { action: "note", note });
        }
      } else {
        await call(`/api/schedule/appointments/${item.appointmentId}`, "PATCH", {
          kind,
          startsAt: toIso(day, time || "09:00"),
          durationMin: duration,
          location,
          note,
        });
      }
    });
  }

  const markDone = () =>
    run(() =>
      isFollowUp
        ? call(`/api/conversations/${item.waContactId}/follow-up`, "PATCH", { action: "done" })
        : call(`/api/schedule/appointments/${item.appointmentId}`, "PATCH", { status: "done" }),
    );
  const cancelAppt = () =>
    run(() => call(`/api/schedule/appointments/${item.appointmentId}`, "PATCH", { status: "cancelled" }));
  const remove = () => run(() => call(`/api/schedule/appointments/${item.appointmentId}`, "DELETE"));

  const heading = formatDate(parseYmd(item.day), locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{kindLabel(t, item.kind)}</p>
          <h3 className="break-words text-base font-semibold text-slate-900">{item.leadName}</h3>
          <p className="text-xs text-slate-500">
            {heading}
            {item.time ? ` · ${item.time}` : ` · ${t.schedNoTime}`}
          </p>
        </div>
        {item.status !== "scheduled" && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {item.status === "done" ? t.schedStatusDone : t.schedStatusCancelled}
          </span>
        )}
      </div>

      {!isFollowUp && (
        <>
          <label className={labelCls}>{t.schedFormType}</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as ItemKind)} className={inputCls}>
            <option value="demo_gmeet">{t.schedKindDemo}</option>
            <option value="visit">{t.schedKindVisit}</option>
            <option value="other">{t.schedKindOther}</option>
          </select>
        </>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">{t.schedFormDate}</label>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">
            {isFollowUp ? t.schedFormTimeOptional : t.schedFormTime}
          </label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
        </div>
      </div>

      {!isFollowUp && (
        <>
          <label className={labelCls}>{t.schedFormDuration}</label>
          <input
            type="number"
            min={5}
            max={1440}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 60)}
            className={inputCls}
          />
          <label className={labelCls}>{t.schedFormLocation}</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={500} className={inputCls} />
          {isUrl(location) && (
            <a
              href={location.trim()}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs font-semibold text-cyan-700 hover:underline"
            >
              {t.schedOpenLink} ↗
            </a>
          )}
        </>
      )}

      <label className={labelCls}>{t.schedFormNote}</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={isFollowUp ? 300 : 500}
        rows={2}
        className={`${inputCls} resize-y`}
      />

      {error && <p className="mt-2 text-xs text-red-600">{t.schedFailed}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={`/chat?leadId=${item.leadId}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {t.schedOpenChat}
        </a>
        {item.status === "scheduled" && (
          <button onClick={markDone} disabled={busy} className="rounded-lg border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50">
            {t.schedMarkDone}
          </button>
        )}
        {!isFollowUp && item.status === "scheduled" && (
          <button onClick={cancelAppt} disabled={busy} className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-50">
            {t.schedCancelAppt}
          </button>
        )}
        {!isFollowUp && (
          <button onClick={remove} disabled={busy} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50">
            {t.schedDelete}
          </button>
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
        <button onClick={onClose} className={ghostBtn}>
          {t.schedClose}
        </button>
        <button onClick={save} disabled={busy || !day || (!isFollowUp && !time && !item.time)} className={primaryBtn}>
          {t.schedSave}
        </button>
      </div>
    </Overlay>
  );
}

// ───────────────────────────── Add ─────────────────────────────

interface LeadHit {
  id: string;
  name: string;
  address: string | null;
  waContactId: string | null;
}

export function AddModal({
  initialDay,
  onClose,
  onChanged,
}: {
  initialDay: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t } = useLanguage();
  const [kind, setKind] = useState<ItemKind>("followup");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<LeadHit[]>([]);
  const [lead, setLead] = useState<LeadHit | null>(null);
  const [day, setDay] = useState(initialDay);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const isFollowUp = kind === "followup";

  useEffect(() => {
    if (lead || query.trim().length < 2) return;
    const id = setTimeout(() => {
      fetch(`/api/schedule/lead-search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => setHits(d.leads ?? []))
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(id);
  }, [query, lead]);

  const shownHits = lead || query.trim().length < 2 ? [] : hits;

  // A follow-up lives on the lead's WhatsApp contact; no contact -> can't.
  const noContact = isFollowUp && !!lead && !lead.waContactId;
  const canSave = !!lead && !!day && !noContact && (isFollowUp || !!time);

  async function save() {
    if (!lead || !canSave) return;
    setBusy(true);
    setError(false);
    try {
      if (isFollowUp) {
        await call(`/api/conversations/${lead.waContactId}/flag`, "PATCH", {
          needsFollowUp: true,
          followUpAt: time ? toIso(day, time) : day,
          followUpNote: note.trim(),
        });
      } else {
        await call("/api/schedule/appointments", "POST", {
          leadId: lead.id,
          kind,
          startsAt: toIso(day, time),
          durationMin: duration,
          location,
          note,
        });
      }
      onChanged();
      onClose();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <h3 className="text-base font-semibold text-slate-900">{t.schedAdd.replace(/^\+\s*/, "")}</h3>

      <label className={labelCls}>{t.schedFormType}</label>
      <select value={kind} onChange={(e) => setKind(e.target.value as ItemKind)} className={inputCls}>
        <option value="followup">{t.schedKindFollowUp}</option>
        <option value="demo_gmeet">{t.schedKindDemo}</option>
        <option value="visit">{t.schedKindVisit}</option>
        <option value="other">{t.schedKindOther}</option>
      </select>

      <label className={labelCls}>{t.schedFormLead}</label>
      {lead ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <span className="min-w-0 break-words font-medium text-slate-800">{lead.name}</span>
          <button
            onClick={() => {
              setLead(null);
              setQuery("");
            }}
            className="shrink-0 text-xs font-semibold text-cyan-700 hover:underline"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.schedFormLeadSearch}
            autoFocus
            className={inputCls}
          />
          {shownHits.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {shownHits.map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => setLead(h)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="block font-medium text-slate-800">{h.name}</span>
                    {h.address && <span className="block truncate text-xs text-slate-400">{h.address}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {noContact && <p className="mt-1 text-xs text-amber-700">{t.schedNoWaContact}</p>}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">{t.schedFormDate}</label>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">
            {isFollowUp ? t.schedFormTimeOptional : t.schedFormTime}
          </label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
        </div>
      </div>

      {!isFollowUp && (
        <>
          <label className={labelCls}>{t.schedFormDuration}</label>
          <input
            type="number"
            min={5}
            max={1440}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 60)}
            className={inputCls}
          />
          <label className={labelCls}>{t.schedFormLocation}</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={500} className={inputCls} />
        </>
      )}

      <label className={labelCls}>{t.schedFormNote}</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={isFollowUp ? 300 : 500}
        rows={2}
        className={`${inputCls} resize-y`}
      />

      {error && <p className="mt-2 text-xs text-red-600">{t.schedFailed}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className={ghostBtn}>
          {t.schedCancel}
        </button>
        <button onClick={save} disabled={busy || !canSave} className={primaryBtn}>
          {t.schedSave}
        </button>
      </div>
    </Overlay>
  );
}
