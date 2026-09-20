"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORY_COLORS, categoryLabels, CATEGORY_LABELS, CATEGORY_LABELS_EN } from "@/lib/leadSegmentation";
import { useLanguage } from "@/lib/i18n/context";
import { formatDate, type Locale } from "@/lib/i18n/locale";

// The 8 real "move a lead" actions — everything /api/leads/[id]/quick-tag
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
  | "letterSent"
  | "repliedBot"
  | "clear";

// Column width both board layouts (the live "Sekarang" board and each
// per-period history board) use for their CSS grid tracks, so a group
// header's `gridColumn: span N` always lines up with N columns' worth of
// width in the board row beneath it.
export const BOARD_COLUMN_WIDTH = "18rem";

// Collapses a left-to-right column list into header cells: consecutive
// columns sharing the same `group` become one cell spanning their combined
// width (rendered with `gridColumn: span N`); an ungrouped column becomes
// a blank same-width spacer, so the header row's tracks stay aligned with
// the board row's regardless of how the groups are arranged.
export function buildBoardHeaderCells<G extends string>(
  columns: { group?: G }[],
  groupLabels: Record<G, string>,
): { label: string | null; span: number }[] {
  const cells: { label: string | null; span: number }[] = [];
  let i = 0;
  while (i < columns.length) {
    const group = columns[i].group;
    if (!group) {
      cells.push({ label: null, span: 1 });
      i++;
      continue;
    }
    let span = 0;
    while (i < columns.length && columns[i].group === group) {
      span++;
      i++;
    }
    cells.push({ label: groupLabels[group], span });
  }
  return cells;
}

// Compact draggable card for boards built from history data, which only
// ever has {id, name} per lead (kanban-history's API doesn't fetch phone/
// stage/lastMessage) — visually consistent with the live board's LeadCard
// but without the fields history can't supply.
export function HistoryBoardCard({
  lead,
  categoryLabel,
  categoryColor,
  draggable,
  onOpen,
}: {
  lead: HistoryLead;
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
      onClick={() => onOpen({ id: lead.id, name: lead.name, categoryLabel, categoryColor })}
      className={`block w-full truncate rounded-lg border border-slate-100 bg-white p-2.5 text-left text-xs font-medium text-slate-700 shadow-sm transition hover:border-cyan-300 hover:shadow ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {lead.name}
    </button>
  );
}

export function quickTagTargets(locale: Locale, clearSuffix: string): { action: QuickTagAction; label: string; color: string }[] {
  const labels = categoryLabels(locale);
  return [
    { action: "noWaAccount", label: labels.no_wa_account, color: CATEGORY_COLORS.no_wa_account },
    { action: "appointment", label: labels.appointment, color: CATEGORY_COLORS.appointment },
    { action: "declined", label: labels.declined, color: CATEGORY_COLORS.declined },
    { action: "repliedBot", label: labels.replied_by_bot, color: CATEGORY_COLORS.replied_by_bot },
    { action: "needsOtherContact", label: labels.needs_other_contact, color: CATEGORY_COLORS.needs_other_contact },
    { action: "needsFollowUp", label: labels.needs_follow_up, color: CATEGORY_COLORS.needs_follow_up },
    { action: "letterSent", label: labels.letter_sent, color: CATEGORY_COLORS.letter_sent },
    { action: "clear", label: `${labels.active} ${clearSuffix}`, color: CATEGORY_COLORS.active },
  ];
}

export async function quickTag(
  leadId: string,
  action: QuickTagAction,
  errors?: { generic: string; conn: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/leads/${leadId}/quick-tag`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error ?? errors?.generic ?? "Failed to move lead." };
    return { ok: true };
  } catch {
    return { ok: false, error: errors?.conn ?? "Failed to move lead — check your connection." };
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
  | "needsFollowUp"
  | "letterSent";

export interface HistoryLead {
  id: string;
  name: string;
}

export interface DayEntry {
  date: string;
  counts: Record<HistoryMetric, number>;
  leads: Record<HistoryMetric, HistoryLead[]>;
}

// Same 9 event categories as kanban-history's API, in CATEGORY_ORDER's
// order minus "non_responsive" (computed, never a logged event) and
// "active" (a default catch-all bucket, not an event that ever gets
// logged). Colors are locale-independent; labels come from
// historyColumnLabels() below so the history table matches the overview
// board's columns in whichever language is active.
export const HISTORY_COLUMNS: { key: HistoryMetric; color: string }[] = [
  { key: "noWaAccount", color: CATEGORY_COLORS.no_wa_account },
  { key: "appointment", color: CATEGORY_COLORS.appointment },
  { key: "declined", color: CATEGORY_COLORS.declined },
  { key: "needsReply", color: CATEGORY_COLORS.needs_reply },
  { key: "repliedByBot", color: CATEGORY_COLORS.replied_by_bot },
  { key: "needsOtherContact", color: CATEGORY_COLORS.needs_other_contact },
  { key: "needsFollowUp", color: CATEGORY_COLORS.needs_follow_up },
  { key: "letterSent", color: CATEGORY_COLORS.letter_sent },
  { key: "untouchedToTouched", color: CATEGORY_COLORS.untouched },
];

export function historyColumnLabels(locale: Locale, untouchedToTouched: string): Record<HistoryMetric, string> {
  const labels = locale === "en" ? CATEGORY_LABELS_EN : CATEGORY_LABELS;
  return {
    noWaAccount: labels.no_wa_account,
    appointment: labels.appointment,
    declined: labels.declined,
    needsReply: labels.needs_reply,
    repliedByBot: labels.replied_by_bot,
    needsOtherContact: labels.needs_other_contact,
    needsFollowUp: labels.needs_follow_up,
    letterSent: labels.letter_sent,
    untouchedToTouched,
  };
}

export function formatDayLabel(dateStr: string, locale: Locale = "id") {
  return formatDate(`${dateStr}T00:00:00Z`, locale, { day: "2-digit", month: "short", timeZone: "UTC" });
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

export function toPeriods(series: DayEntry[], locale: Locale = "id"): PeriodEntry[] {
  return [...series]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((d) => ({ key: d.date, label: formatDayLabel(d.date, locale), counts: d.counts, leads: d.leads }));
}

function formatWeekLabel(startDate: string, endDate: string, locale: Locale) {
  const fmt = (s: string) => formatDate(`${s}T00:00:00Z`, locale, { day: "2-digit", month: "short", timeZone: "UTC" });
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

// Mon-Sun buckets, computed client-side from the same daily series — no
// separate backend route, per the plan. Lead lists are merged and
// deduped per category (a lead could in principle show up on more than
// one day of the week, though rare in practice).
// Only these 6 are mutually-exclusive "which state-tag button did someone
// press" events — the same shape as classifyLead()'s manual flags, so a
// lead sitting under two of them in the same week reads as a contradiction
// (a real case: Klinik Pratama Adera showed under both "Dijawab Bot" and
// "Appointment" for the same Mon-Sun week — bot-replied Thursday,
// Appointment tagged Saturday). Last one that week wins.
// `untouchedToTouched` and `needsReply` are deliberately excluded: they're
// milestone/volume markers, not alternative descriptions of current state
// — "became touched on day 1" and "sent a message on day 4" both stay
// true regardless of what gets tagged afterward, so they keep the old
// union-and-dedupe-by-id behavior instead of competing for one slot.
const EXCLUSIVE_METRICS: HistoryMetric[] = [
  "noWaAccount",
  "appointment",
  "declined",
  "needsOtherContact",
  "needsFollowUp",
  "letterSent",
  "repliedByBot",
];

export function groupWeekly(series: DayEntry[], locale: Locale = "id"): PeriodEntry[] {
  const weekLabel = new Map<string, string>();
  const weekAdditive = new Map<string, Record<HistoryMetric, Map<string, string>>>(); // leadId -> name
  // weekKey -> leadId -> latest {category, name} among EXCLUSIVE_METRICS only.
  const weekExclusiveLatest = new Map<string, Map<string, { category: HistoryMetric; name: string }>>();

  const chronological = [...series].sort((a, b) => a.date.localeCompare(b.date));
  for (const day of chronological) {
    const d = new Date(`${day.date}T00:00:00Z`);
    const dow = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - dow);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const weekKey = monday.toISOString().slice(0, 10);

    if (!weekLabel.has(weekKey)) {
      weekLabel.set(weekKey, formatWeekLabel(weekKey, sunday.toISOString().slice(0, 10), locale));
    }
    let exclusiveLatest = weekExclusiveLatest.get(weekKey);
    if (!exclusiveLatest) {
      exclusiveLatest = new Map();
      weekExclusiveLatest.set(weekKey, exclusiveLatest);
    }
    let additive = weekAdditive.get(weekKey);
    if (!additive) {
      additive = emptyMetricRecord<Map<string, string>>(() => new Map());
      weekAdditive.set(weekKey, additive);
    }

    for (const col of HISTORY_COLUMNS) {
      const isExclusive = (EXCLUSIVE_METRICS as string[]).includes(col.key);
      for (const lead of day.leads[col.key]) {
        if (isExclusive) {
          // Days are processed oldest-first, so this later write naturally
          // overwrites whatever category an earlier day this week recorded
          // for the same lead — no extra timestamp bookkeeping needed.
          exclusiveLatest.set(lead.id, { category: col.key, name: lead.name });
        } else {
          additive[col.key].set(lead.id, lead.name);
        }
      }
    }
  }

  const result: PeriodEntry[] = [];
  for (const weekKey of weekLabel.keys()) {
    const leads = emptyMetricRecord<HistoryLead[]>(() => []);
    for (const [id, { category, name }] of weekExclusiveLatest.get(weekKey) ?? []) {
      leads[category].push({ id, name });
    }
    const additive = weekAdditive.get(weekKey)!;
    for (const col of HISTORY_COLUMNS) {
      if ((EXCLUSIVE_METRICS as string[]).includes(col.key)) continue;
      for (const [id, name] of additive[col.key]) leads[col.key].push({ id, name });
    }
    const counts = {} as Record<HistoryMetric, number>;
    for (const col of HISTORY_COLUMNS) {
      leads[col.key].sort((a, b) => a.name.localeCompare(b.name));
      counts[col.key] = leads[col.key].length;
    }
    result.push({ key: weekKey, label: weekLabel.get(weekKey)!, counts, leads });
  }
  return result.sort((a, b) => b.key.localeCompare(a.key));
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
  const { locale } = useLanguage();
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
            {formatDate(lead.lastMessageAt, locale, { day: "2-digit", month: "short" })}
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
  const { locale, t } = useLanguage();

  async function handleMove(action: QuickTagAction) {
    setPending(action);
    setError(null);
    const result = await quickTag(selection.id, action, { generic: t.quickTagFailedGeneric, conn: t.quickTagFailedConn });
    setPending(null);
    if (!result.ok) {
      setError(result.error ?? t.quickTagFailedGeneric);
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
            aria-label={t.close}
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
                <span className="text-slate-400">{t.popupNomor}</span>
                <span className="font-medium text-slate-700">{selection.phoneNormalized ?? "—"}</span>
              </div>
            )}
            {selection.lastMessageAt !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t.popupLastMessage}</span>
                <span className="font-medium text-slate-700">
                  {selection.lastMessageAt
                    ? formatDate(selection.lastMessageAt, locale, { day: "2-digit", month: "short", year: "numeric" })
                    : t.popupNever}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="mb-4">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{t.popupMoveTo}</div>
          <div className="flex flex-wrap gap-1.5">
            {quickTagTargets(locale, t.quickTagClearSuffix).map((target) => (
              <button
                key={target.action}
                type="button"
                disabled={pending !== null}
                onClick={() => handleMove(target.action)}
                className="rounded-full px-2.5 py-1 text-xs font-medium transition hover:brightness-95 disabled:opacity-50"
                style={{ backgroundColor: `${target.color}1a`, color: target.color }}
              >
                {pending === target.action ? "…" : target.label}
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
          {t.popupOpenChat}
        </Link>
      </div>
    </div>
  );
}

// Sub-nav between the Kanban's two routes — same visual language as
// ReportsTabs one level up, but scoped to /reports/kanban/* since these
// aren't siblings of Overview/History.
export function KanbanSubNav({ active }: { active: "overview" | "history" }) {
  const { t } = useLanguage();
  const tabs: { href: string; key: "overview" | "history"; label: string }[] = [
    { href: "/reports/kanban/overview", key: "overview", label: t.kanbanSubnavBoard },
    { href: "/reports/kanban/daily", key: "history", label: t.kanbanSubnavHistory },
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
