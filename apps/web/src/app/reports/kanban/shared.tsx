"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/leadSegmentation";

// The 7 real "move a lead" actions — everything /api/leads/[id]/quick-tag
// accepts. Three Kanban categories (untouched, needs_reply, non_responsive)
// have no corresponding action: you can't force a lead back to "never
// contacted", fabricate an inbound message, or hand-set a computed
// silence pattern, so they're never a valid drop target / "Pindahkan ke"
// option below.
export type QuickTagAction =
  | "noWaAccount"
  | "appointment"
  | "declined"
  | "needsOtherContact"
  | "needsFollowUp"
  | "repliedBot"
  | "clear";

export const QUICK_TAG_TARGETS: { action: QuickTagAction; label: string; color: string }[] = [
  { action: "noWaAccount", label: CATEGORY_LABELS.no_wa_account, color: CATEGORY_COLORS.no_wa_account },
  { action: "appointment", label: CATEGORY_LABELS.appointment, color: CATEGORY_COLORS.appointment },
  { action: "declined", label: CATEGORY_LABELS.declined, color: CATEGORY_COLORS.declined },
  { action: "repliedBot", label: CATEGORY_LABELS.replied_by_bot, color: CATEGORY_COLORS.replied_by_bot },
  { action: "needsOtherContact", label: CATEGORY_LABELS.needs_other_contact, color: CATEGORY_COLORS.needs_other_contact },
  { action: "needsFollowUp", label: CATEGORY_LABELS.needs_follow_up, color: CATEGORY_COLORS.needs_follow_up },
  { action: "clear", label: `${CATEGORY_LABELS.active} (hapus tag)`, color: CATEGORY_COLORS.active },
];

export async function quickTag(leadId: string, action: QuickTagAction): Promise<{ ok: boolean; error?: string }> {
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

export interface CardLead {
  id: string;
  name: string;
  phoneNormalized: string | null;
  pipelineStage: string;
  pipelineStageLabel: string;
  pipelineStageColor: string;
  lastMessageAt: string | null;
}

export type HistoryMetric =
  | "untouchedToTouched"
  | "needsReply"
  | "repliedByBot"
  | "noWaAccount"
  | "appointment"
  | "declined"
  | "needsOtherContact"
  | "needsFollowUp";

export interface HistoryLead {
  id: string;
  name: string;
}

export interface DayEntry {
  date: string;
  counts: Record<HistoryMetric, number>;
  leads: Record<HistoryMetric, HistoryLead[]>;
}

// Same 8 event categories as kanban-history's API, in CATEGORY_ORDER's
// order minus "non_responsive" (computed, never a logged event) and
// "active" (a default catch-all bucket, not an event that ever gets
// logged). Reuses leadSegmentation's labels/colors so the history table
// matches the overview board's columns visually.
export const HISTORY_COLUMNS: { key: HistoryMetric; label: string; color: string }[] = [
  { key: "noWaAccount", label: CATEGORY_LABELS.no_wa_account, color: CATEGORY_COLORS.no_wa_account },
  { key: "appointment", label: CATEGORY_LABELS.appointment, color: CATEGORY_COLORS.appointment },
  { key: "declined", label: CATEGORY_LABELS.declined, color: CATEGORY_COLORS.declined },
  { key: "needsReply", label: CATEGORY_LABELS.needs_reply, color: CATEGORY_COLORS.needs_reply },
  { key: "repliedByBot", label: CATEGORY_LABELS.replied_by_bot, color: CATEGORY_COLORS.replied_by_bot },
  { key: "needsOtherContact", label: CATEGORY_LABELS.needs_other_contact, color: CATEGORY_COLORS.needs_other_contact },
  { key: "needsFollowUp", label: CATEGORY_LABELS.needs_follow_up, color: CATEGORY_COLORS.needs_follow_up },
  { key: "untouchedToTouched", label: "Belum Disentuh → Disentuh", color: CATEGORY_COLORS.untouched },
];

export function formatDayLabel(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export interface PeriodEntry {
  key: string;
  label: string;
  counts: Record<HistoryMetric, number>;
  leads: Record<HistoryMetric, HistoryLead[]>;
}

export function emptyMetricRecord<T>(fill: () => T): Record<HistoryMetric, T> {
  const rec = {} as Record<HistoryMetric, T>;
  for (const col of HISTORY_COLUMNS) rec[col.key] = fill();
  return rec;
}

export function toPeriods(series: DayEntry[]): PeriodEntry[] {
  return [...series]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((d) => ({ key: d.date, label: formatDayLabel(d.date), counts: d.counts, leads: d.leads }));
}

function formatWeekLabel(startDate: string, endDate: string) {
  const fmt = (s: string) =>
    new Date(`${s}T00:00:00Z`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", timeZone: "UTC" });
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

// Mon-Sun buckets, computed client-side from the same daily series — no
// separate backend route, per the plan. Lead lists are merged and
// deduped per category (a lead could in principle show up on more than
// one day of the week, though rare in practice).
export function groupWeekly(series: DayEntry[]): PeriodEntry[] {
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

// Generic popup selection — the live board's cards carry full CardLead
// data, history's cards only ever have {id, name} (kanban-history's API
// doesn't fetch phone/stage/lastMessage), so everything past name is
// optional.
export interface SelectedLead {
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
export function LeadCard({
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
// columns — same popup as the live board, just built from the minimal
// {id, name} the history API returns.
export function HistoryLeadCard({
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

export function LeadPopup({
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

// Sub-nav between the Kanban's two routes — same visual language as
// ReportsTabs one level up, but scoped to /reports/kanban/* since these
// aren't siblings of Overview/History.
export function KanbanSubNav({ active }: { active: "overview" | "history" }) {
  const tabs: { href: string; key: "overview" | "history"; label: string }[] = [
    { href: "/reports/kanban/overview", key: "overview", label: "Board" },
    { href: "/reports/kanban/daily", key: "history", label: "Riwayat" },
  ];
  return (
    <div className="mb-4 flex w-fit gap-1 rounded-lg bg-slate-100 p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            active === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
