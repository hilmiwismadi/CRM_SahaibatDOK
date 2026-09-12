"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppSidebar from "@/app/components/AppSidebar";
import ReportsTabs from "../ReportsTabs";
import { CATEGORY_COLORS, CATEGORY_GRADIENTS, CATEGORY_LABELS, CATEGORY_ORDER, type LeadCategory } from "@/lib/leadSegmentation";

// The 6 real "move a lead" actions — everything /api/leads/[id]/quick-tag
// accepts. Two Kanban categories (untouched, needs_reply) have no
// corresponding action: you can't force a lead back to "never contacted"
// or fabricate an inbound message, so they're never a valid drop target /
// "Pindahkan ke" option below.
type QuickTagAction = "noWaAccount" | "appointment" | "needsOtherContact" | "needsFollowUp" | "repliedBot" | "clear";

const QUICK_TAG_TARGETS: { action: QuickTagAction; label: string; color: string }[] = [
  { action: "noWaAccount", label: CATEGORY_LABELS.no_wa_account, color: CATEGORY_COLORS.no_wa_account },
  { action: "appointment", label: CATEGORY_LABELS.appointment, color: CATEGORY_COLORS.appointment },
  { action: "repliedBot", label: CATEGORY_LABELS.replied_by_bot, color: CATEGORY_COLORS.replied_by_bot },
  { action: "needsOtherContact", label: CATEGORY_LABELS.needs_other_contact, color: CATEGORY_COLORS.needs_other_contact },
  { action: "needsFollowUp", label: CATEGORY_LABELS.needs_follow_up, color: CATEGORY_COLORS.needs_follow_up },
  { action: "clear", label: "Aktif (hapus tag)", color: CATEGORY_COLORS.active },
];

// Sekarang's columns that are valid drag-and-drop targets, mapped to the
// quick-tag action a drop there performs.
const DROPPABLE_ACTION: Partial<Record<LeadCategory, QuickTagAction>> = {
  no_wa_account: "noWaAccount",
  appointment: "appointment",
  replied_by_bot: "repliedBot",
  needs_other_contact: "needsOtherContact",
  needs_follow_up: "needsFollowUp",
  active: "clear",
};

async function quickTag(leadId: string, action: QuickTagAction): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/leads/${leadId}/quick-tag`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error ?? "Gagal memindahkan lead." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal memindahkan lead — cek koneksi." };
  }
}

interface CardLead {
  id: string;
  name: string;
  phoneNormalized: string | null;
  pipelineStage: string;
  pipelineStageLabel: string;
  pipelineStageColor: string;
  lastMessageAt: string | null;
}

interface Segmentation {
  total: number;
  untouched: { count: number; leads: CardLead[] };
  touched: {
    count: number;
    categories: { key: LeadCategory; label: string; count: number; leads: CardLead[] }[];
  };
}

type HistoryMetric =
  | "untouchedToTouched"
  | "needsReply"
  | "repliedByBot"
  | "noWaAccount"
  | "appointment"
  | "needsOtherContact"
  | "needsFollowUp";

interface HistoryLead {
  id: string;
  name: string;
}

interface DayEntry {
  date: string;
  counts: Record<HistoryMetric, number>;
  leads: Record<HistoryMetric, HistoryLead[]>;
}

// Same 7 event categories as kanban-history's API, in CATEGORY_ORDER's
// order minus "active" (a default catch-all bucket, not an event that
// ever gets logged). Reuses leadSegmentation's labels/colors so the
// history table matches the "Sekarang" columns visually.
const HISTORY_COLUMNS: { key: HistoryMetric; label: string; color: string }[] = [
  { key: "noWaAccount", label: CATEGORY_LABELS.no_wa_account, color: CATEGORY_COLORS.no_wa_account },
  { key: "appointment", label: CATEGORY_LABELS.appointment, color: CATEGORY_COLORS.appointment },
  { key: "needsReply", label: CATEGORY_LABELS.needs_reply, color: CATEGORY_COLORS.needs_reply },
  { key: "repliedByBot", label: CATEGORY_LABELS.replied_by_bot, color: CATEGORY_COLORS.replied_by_bot },
  { key: "needsOtherContact", label: CATEGORY_LABELS.needs_other_contact, color: CATEGORY_COLORS.needs_other_contact },
  { key: "needsFollowUp", label: CATEGORY_LABELS.needs_follow_up, color: CATEGORY_COLORS.needs_follow_up },
  { key: "untouchedToTouched", label: "Belum Disentuh → Disentuh", color: CATEGORY_COLORS.untouched },
];

function formatDayLabel(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

interface PeriodEntry {
  key: string;
  label: string;
  counts: Record<HistoryMetric, number>;
  leads: Record<HistoryMetric, HistoryLead[]>;
}

function emptyMetricRecord<T>(fill: () => T): Record<HistoryMetric, T> {
  const rec = {} as Record<HistoryMetric, T>;
  for (const col of HISTORY_COLUMNS) rec[col.key] = fill();
  return rec;
}

function toPeriods(series: DayEntry[]): PeriodEntry[] {
  return [...series]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((d) => ({ key: d.date, label: formatDayLabel(d.date), counts: d.counts, leads: d.leads }));
}

// Mon-Sun buckets, computed client-side from the same daily series — no
// separate backend route, per the plan. Lead lists are merged and
// deduped per category (a lead could in principle show up on more than
// one day of the week, though rare in practice).
function groupWeekly(series: DayEntry[]): PeriodEntry[] {
  const byWeek = new Map<string, PeriodEntry>();
  for (const day of series) {
    const d = new Date(`${day.date}T00:00:00Z`);
    const dow = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - dow);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const key = monday.toISOString().slice(0, 10);

    let entry = byWeek.get(key);
    if (!entry) {
      entry = {
        key,
        label: formatWeekLabel(key, sunday.toISOString().slice(0, 10)),
        counts: emptyMetricRecord(() => 0),
        leads: emptyMetricRecord(() => []),
      };
      byWeek.set(key, entry);
    }
    for (const col of HISTORY_COLUMNS) {
      entry.counts[col.key] += day.counts[col.key];
      entry.leads[col.key].push(...day.leads[col.key]);
    }
  }
  for (const entry of byWeek.values()) {
    for (const col of HISTORY_COLUMNS) {
      const seen = new Set<string>();
      entry.leads[col.key] = entry.leads[col.key]
        .filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
  }
  return Array.from(byWeek.values()).sort((a, b) => b.key.localeCompare(a.key));
}

function formatWeekLabel(startDate: string, endDate: string) {
  const fmt = (s: string) =>
    new Date(`${s}T00:00:00Z`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", timeZone: "UTC" });
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

// Generic popup selection — Sekarang's cards carry full CardLead data,
// History's cards only ever have {id, name} (kanban-history's API doesn't
// fetch phone/stage/lastMessage), so everything past name is optional.
interface SelectedLead {
  id: string;
  name: string;
  categoryLabel?: string;
  categoryColor?: string;
  pipelineStageLabel?: string;
  pipelineStageColor?: string;
  phoneNormalized?: string | null;
  lastMessageAt?: string | null;
}

// Clicking a lead opens a quick-view popup (name, stage, current tag, last
// contact, "Pindahkan ke" actions) instead of jumping straight into /chat —
// matches how CRM_Grad's DailyKanban.tsx behaves (click a card → info +
// move-to popup; chat/edit is a secondary action inside it). Cards are also
// draggable — dropping on another column performs the same move.
function LeadCard({
  lead,
  categoryLabel,
  categoryColor,
  draggable,
  onOpen,
}: {
  lead: CardLead;
  categoryLabel: string;
  categoryColor: string;
  draggable: boolean;
  onOpen: (selection: SelectedLead) => void;
}) {
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={draggable ? (e) => e.dataTransfer.setData("text/plain", lead.id) : undefined}
      onClick={() =>
        onOpen({
          id: lead.id,
          name: lead.name,
          categoryLabel,
          categoryColor,
          pipelineStageLabel: lead.pipelineStageLabel,
          pipelineStageColor: lead.pipelineStageColor,
          phoneNormalized: lead.phoneNormalized,
          lastMessageAt: lead.lastMessageAt,
        })
      }
      className={`block w-full rounded-lg border border-slate-100 bg-white p-3 text-left shadow-sm transition hover:border-cyan-300 hover:shadow ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="truncate text-sm font-semibold text-slate-900">{lead.name}</div>
      <div className="mt-1 flex items-center justify-between">
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
          style={{ backgroundColor: lead.pipelineStageColor }}
        >
          {lead.pipelineStageLabel}
        </span>
        {lead.lastMessageAt && (
          <span className="text-[10px] text-slate-400">
            {new Date(lead.lastMessageAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
          </span>
        )}
      </div>
      {lead.phoneNormalized && <div className="mt-1 truncate text-[11px] text-slate-400">{lead.phoneNormalized}</div>}
    </button>
  );
}

// Compact clickable name-card for the history (Per Tanggal/Per Minggu)
// columns — same popup as Sekarang, just built from the minimal {id, name}
// the history API returns.
function HistoryLeadCard({
  lead,
  index,
  categoryLabel,
  categoryColor,
  onOpen,
}: {
  lead: HistoryLead;
  index: number;
  categoryLabel: string;
  categoryColor: string;
  onOpen: (selection: SelectedLead) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen({ id: lead.id, name: lead.name, categoryLabel, categoryColor })}
      className="block w-full truncate rounded px-1.5 py-1 text-left text-[11px] text-slate-600 transition hover:bg-slate-50 hover:text-cyan-700"
    >
      {index + 1}. {lead.name}
    </button>
  );
}

function LeadPopup({
  selection,
  onClose,
  onMoved,
}: {
  selection: SelectedLead;
  onClose: () => void;
  onMoved: () => void;
}) {
  const [pending, setPending] = useState<QuickTagAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleMove(action: QuickTagAction) {
    setPending(action);
    setError(null);
    const result = await quickTag(selection.id, action);
    setPending(null);
    if (!result.ok) {
      setError(result.error ?? "Gagal memindahkan lead.");
      return;
    }
    onMoved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">{selection.name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {(selection.pipelineStageLabel || selection.categoryLabel) && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {selection.pipelineStageLabel && (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: selection.pipelineStageColor }}
              >
                {selection.pipelineStageLabel}
              </span>
            )}
            {selection.categoryLabel && (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${selection.categoryColor}1a`, color: selection.categoryColor }}
              >
                {selection.categoryLabel}
              </span>
            )}
          </div>
        )}

        {(selection.phoneNormalized !== undefined || selection.lastMessageAt !== undefined) && (
          <div className="mb-4 space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
            {selection.phoneNormalized !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Nomor</span>
                <span className="font-medium text-slate-700">{selection.phoneNormalized ?? "—"}</span>
              </div>
            )}
            {selection.lastMessageAt !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Pesan terakhir</span>
                <span className="font-medium text-slate-700">
                  {selection.lastMessageAt
                    ? new Date(selection.lastMessageAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "Belum pernah"}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="mb-4">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Pindahkan ke</div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TAG_TARGETS.map((t) => (
              <button
                key={t.action}
                type="button"
                disabled={pending !== null}
                onClick={() => handleMove(t.action)}
                className="rounded-full px-2.5 py-1 text-xs font-medium transition hover:brightness-95 disabled:opacity-50"
                style={{ backgroundColor: `${t.color}1a`, color: t.color }}
              >
                {pending === t.action ? "…" : t.label}
              </button>
            ))}
          </div>
          {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
        </div>

        <Link
          href={`/chat?leadId=${selection.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg bg-cyan-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-cyan-700"
        >
          Buka Chat
        </Link>
      </div>
    </div>
  );
}

type View = "now" | "daily" | "weekly";

export default function KanbanPage() {
  const [data, setData] = useState<Segmentation | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("now");
  const [history, setHistory] = useState<DayEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selected, setSelected] = useState<SelectedLead | null>(null);
  const [dragOverKey, setDragOverKey] = useState<LeadCategory | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 3000);
  }, []);

  const loadSegmentation = useCallback(() => {
    return fetch("/api/reports/segmentation")
      .then((r) => r.json())
      .then((d) => setData(d));
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadSegmentation().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadSegmentation]);

  useEffect(() => {
    if (view === "now" || history) return;
    let cancelled = false;
    setHistoryLoading(true);
    fetch("/api/reports/kanban-history?days=60")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setHistory(d.series);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, history]);

  // Called after any successful quick-tag move (drag or popup): refresh the
  // live board, and invalidate the cached history so switching to Per
  // Tanggal/Per Minggu picks up the change instead of showing stale data.
  function handleMoved() {
    loadSegmentation();
    setHistory(null);
  }

  async function handleDrop(leadId: string, targetKey: LeadCategory) {
    setDragOverKey(null);
    const action = DROPPABLE_ACTION[targetKey];
    if (!action) return;
    const result = await quickTag(leadId, action);
    if (!result.ok) {
      showToast(result.error ?? "Gagal memindahkan lead.");
      return;
    }
    handleMoved();
  }

  // Columns in the same fixed order used everywhere else this
  // classification appears (dashboard's tag filter, /reports' funnel) —
  // see apps/web/src/lib/leadSegmentation.ts.
  const columns = data
    ? CATEGORY_ORDER.map((key) => {
        if (key === "untouched") {
          return { key, label: CATEGORY_LABELS.untouched, leads: data.untouched.leads };
        }
        const cat = data.touched.categories.find((c) => c.key === key);
        return { key, label: cat?.label ?? CATEGORY_LABELS[key], leads: cat?.leads ?? [] };
      })
    : [];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="reports" />
      <div className="flex flex-1 flex-col overflow-hidden p-6">
        <h1 className="mb-1 text-lg font-bold text-slate-900">Sales report</h1>
        <p className="mb-4 text-sm text-slate-500">
          Kanban lead per status — klik kartu untuk lihat ringkasan &amp; pindahkan tag, atau drag ke kolom lain.
          &ldquo;Belum Disentuh&rdquo;, &ldquo;Belum Dijawab&rdquo;, dan &ldquo;Tidak Reply Lagi&rdquo; tidak bisa dipindah manual — itu status otomatis, bukan tag.
        </p>
        <ReportsTabs />

        <div className="mb-4 flex w-fit gap-1 rounded-lg bg-slate-100 p-1">
          {([
            ["now", "Sekarang"],
            ["daily", "Per Tanggal"],
            ["weekly", "Per Minggu"],
          ] as [View, string][]).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {view === "now" && (
          <>
            {loading && <div className="text-sm text-slate-400">Loading…</div>}
            {data && (
              <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
                {columns.map((col) => {
                  const droppable = Boolean(DROPPABLE_ACTION[col.key]);
                  return (
                    <div
                      key={col.key}
                      onDragOver={
                        droppable
                          ? (e) => {
                              e.preventDefault();
                              setDragOverKey(col.key);
                            }
                          : undefined
                      }
                      onDragLeave={droppable ? () => setDragOverKey((k) => (k === col.key ? null : k)) : undefined}
                      onDrop={
                        droppable
                          ? (e) => {
                              e.preventDefault();
                              const leadId = e.dataTransfer.getData("text/plain");
                              if (leadId) handleDrop(leadId, col.key);
                            }
                          : undefined
                      }
                      className={`flex w-72 shrink-0 flex-col rounded-xl bg-slate-100/60 p-3 transition ${
                        dragOverKey === col.key ? "ring-2 ring-cyan-400 bg-cyan-50/60" : ""
                      }`}
                    >
                      <div className="mb-3 flex items-center gap-2 px-1">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={
                            CATEGORY_GRADIENTS[col.key]
                              ? { backgroundImage: `linear-gradient(135deg, ${CATEGORY_GRADIENTS[col.key]![0]}, ${CATEGORY_GRADIENTS[col.key]![1]})` }
                              : { backgroundColor: CATEGORY_COLORS[col.key] }
                          }
                        />
                        <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                          {col.leads.length}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                        {col.leads.length === 0 && (
                          <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                            Kosong
                          </div>
                        )}
                        {col.leads.map((lead) => (
                          <LeadCard
                            key={lead.id}
                            lead={lead}
                            categoryLabel={col.label}
                            categoryColor={CATEGORY_COLORS[col.key]}
                            draggable
                            onOpen={setSelected}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {(view === "daily" || view === "weekly") && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <p className="mb-3 text-xs text-slate-400">
              Jumlah lead yang <strong>baru</strong> masuk ke kategori tersebut pada {view === "daily" ? "tanggal" : "minggu"} itu —
              bukan snapshot total saat ini. Kategori tag (Tidak Ada Kontak WA, Appointment, Perlu Kontak Lain, Butuh
              Follow Up) hanya tercatat sejak fitur ini aktif; hari-hari sebelumnya akan tampak 0 meski lead sudah
              ditandai duluan.
            </p>
            {historyLoading && <div className="text-sm text-slate-400">Loading…</div>}
            {!historyLoading && history && (
              <>
                {/* Totals across the loaded 60-day window — headline numbers
                    before the period-by-period detail, so a glance answers
                    "how are we doing overall" first. */}
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {HISTORY_COLUMNS.map((col) => {
                    const total = history.reduce((sum, d) => sum + d.counts[col.key], 0);
                    return (
                      <div
                        key={col.key}
                        className="rounded-xl border p-3"
                        style={{ backgroundColor: `${col.color}12`, borderColor: `${col.color}33` }}
                      >
                        <div className="text-xl font-bold" style={{ color: col.color }}>
                          {total}
                        </div>
                        <div className="text-xs font-medium" style={{ color: col.color }}>
                          {col.label}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* One card per period, columns = categories holding the
                    actual leads (not just a count) — matches CRM_Grad's
                    SalesReport.tsx layout: a period card with a colored
                    pill header per category and a numbered list underneath. */}
                <div className="flex-1 overflow-y-auto pb-4">
                  {(view === "daily" ? toPeriods(history) : groupWeekly(history)).map((period) => {
                    const total = HISTORY_COLUMNS.reduce((sum, c) => sum + period.counts[c.key], 0);
                    return (
                      <div key={period.key} className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                          <span className="text-sm font-semibold text-slate-700">{period.label}</span>
                          <span className="text-xs text-slate-400">{total} event</span>
                        </div>
                        {total === 0 ? (
                          <div className="px-4 py-5 text-center text-xs text-slate-300">Tidak ada aktivitas</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-7">
                            {HISTORY_COLUMNS.map((col) => {
                              const leads = period.leads[col.key];
                              return (
                                <div key={col.key}>
                                  <span
                                    className="mb-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
                                    style={{ backgroundColor: `${col.color}1a`, color: col.color }}
                                  >
                                    {col.label} ({leads.length})
                                  </span>
                                  {leads.length === 0 ? (
                                    <div className="mt-1 text-[11px] italic text-slate-300">—</div>
                                  ) : (
                                    <div className="mt-1 space-y-0.5">
                                      {leads.slice(0, 5).map((l, i) => (
                                        <HistoryLeadCard
                                          key={l.id}
                                          lead={l}
                                          index={i}
                                          categoryLabel={col.label}
                                          categoryColor={col.color}
                                          onOpen={setSelected}
                                        />
                                      ))}
                                      {leads.length > 5 && (
                                        <div className="px-1.5 text-[10px] text-slate-400">+{leads.length - 5} lainnya</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {selected && <LeadPopup selection={selected} onClose={() => setSelected(null)} onMoved={handleMoved} />}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
