"use client";

import { useCallback, useEffect, useState } from "react";
import AppSidebar from "@/app/components/AppSidebar";
import ReportsTabs from "../../ReportsTabs";
import { CATEGORY_COLORS, categoryLabels, type LeadCategory } from "@/lib/leadSegmentation";
import { useLanguage } from "@/lib/i18n/context";
import type { Translations } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/i18n/locale";
import {
  type DayEntry,
  type HistoryMetric,
  type PeriodEntry,
  type SelectedLead,
  type QuickTagAction,
  HISTORY_COLUMNS,
  historyColumnLabels,
  HistoryBoardCard,
  LeadPopup,
  KanbanSubNav,
  BOARD_COLUMN_WIDTH,
  buildBoardHeaderCells,
  quickTag,
  toPeriods,
  groupWeekly,
} from "../shared";

type Grouping = "daily" | "weekly";
type GroupKey = "no_reply" | "unanswered" | "needs_more" | "resolved";
// The two "Tidak Reply" leaves and "On Going" are all synthetic columns
// with no backing data: no_reply_after_pitch, non_responsive, and
// leadSegmentation's fallback ("active") are every one of them *computed*
// from message patterns, never a tag_change event someone fires — so
// there's nothing to count per day/week without making a number up. Each
// always renders the "not tracked" placeholder instead. See
// /reports/overview for their current (not historical) counts.
type SyntheticKey = "nonResponsive" | "notInterested" | "onGoing";

function syntheticInfo(labels: Record<LeadCategory, string>): Record<SyntheticKey, { label: string; color: string }> {
  return {
    nonResponsive: { label: labels.non_responsive, color: CATEGORY_COLORS.non_responsive },
    notInterested: { label: labels.no_reply_after_pitch, color: CATEGORY_COLORS.no_reply_after_pitch },
    onGoing: { label: labels.active, color: CATEGORY_COLORS.active },
  };
}

const byMetric = new Map(HISTORY_COLUMNS.map((c) => [c.key, c]));

// Same left-to-right story as /reports/kanban/overview's live board: did we
// even reach them, then did they reply at all (Tidak Reply), then — for
// the ones who did but haven't given a real answer yet — did a bot field
// it or is it just sitting unclassified, then the two "needs more from
// us" tags, then the two definitive outcomes.
const HISTORY_FUNNEL_COLUMNS: { key: HistoryMetric | SyntheticKey; group?: GroupKey }[] = [
  { key: "untouchedToTouched" },
  { key: "noWaAccount" },
  { key: "nonResponsive", group: "no_reply" },
  { key: "notInterested", group: "no_reply" },
  { key: "repliedByBot", group: "unanswered" },
  { key: "onGoing", group: "unanswered" },
  { key: "needsFollowUp", group: "needs_more" },
  { key: "needsOtherContact", group: "needs_more" },
  { key: "appointment", group: "resolved" },
  { key: "declined", group: "resolved" },
];

function groupLabels(t: Translations): Record<GroupKey, string> {
  return {
    no_reply: t.groupNoReply,
    unanswered: t.groupUnanswered,
    needs_more: t.groupNeedsMore,
    resolved: t.groupResolved,
  };
}

// The 6 history metrics a drop actually can change — same quick-tag
// actions the live board offers, minus "untouchedToTouched" (can't
// fabricate an untouched->touched transition) and "onGoing" (nothing to
// hand-set, see above).
const DROPPABLE_ACTION: Partial<Record<HistoryMetric, QuickTagAction>> = {
  noWaAccount: "noWaAccount",
  appointment: "appointment",
  declined: "declined",
  repliedByBot: "repliedBot",
  needsOtherContact: "needsOtherContact",
  needsFollowUp: "needsFollowUp",
};

// One mini kanban board per period — dragging a card here applies the
// change right now (same /api/leads/[id]/quick-tag the live board uses);
// it doesn't rewrite history, so the card stays visible under its
// original day/week too. That's intentional: this board is a fast way to
// reclassify a lead you spot while scanning the past, not a time machine.
function PeriodBoard({
  period,
  onMoved,
  onOpen,
  onDropError,
}: {
  period: PeriodEntry;
  onMoved: () => void;
  onOpen: (s: SelectedLead) => void;
  onDropError: (msg: string) => void;
}) {
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const total = HISTORY_COLUMNS.reduce((sum, c) => sum + period.counts[c.key], 0);
  const { locale, t } = useLanguage();
  const labels = historyColumnLabels(locale, t.untouchedToTouched);
  const SYNTHETIC_INFO = syntheticInfo(categoryLabels(locale));
  const HEADER_CELLS = buildBoardHeaderCells(HISTORY_FUNNEL_COLUMNS, groupLabels(t));

  async function handleDrop(leadId: string, targetKey: HistoryMetric) {
    setDragOverKey(null);
    const action = DROPPABLE_ACTION[targetKey];
    if (!action) return;
    const result = await quickTag(leadId, action, { generic: t.quickTagFailedGeneric, conn: t.quickTagFailedConn });
    if (!result.ok) {
      onDropError(result.error ?? t.quickTagFailedGeneric);
      return;
    }
    onMoved();
  }

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <span className="text-sm font-semibold text-slate-700">{period.label}</span>
        <span className="text-xs text-slate-400">{total} {t.eventCountSuffix}</span>
      </div>
      {total === 0 ? (
        <div className="px-4 py-5 text-center text-xs text-slate-300">{t.noActivity}</div>
      ) : (
        <div className="overflow-x-auto p-3">
          <div className="grid shrink-0 gap-3 pb-1.5" style={{ gridAutoFlow: "column", gridAutoColumns: BOARD_COLUMN_WIDTH }}>
            {HEADER_CELLS.map((cell, i) => (
              <div
                key={i}
                style={{ gridColumn: `span ${cell.span}` }}
                className={
                  cell.label
                    ? "rounded-t-md border border-b-0 border-slate-200 bg-slate-100 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                    : ""
                }
              >
                {cell.label}
              </div>
            ))}
          </div>
          <div className="grid gap-3" style={{ gridAutoFlow: "column", gridAutoColumns: BOARD_COLUMN_WIDTH }}>
            {HISTORY_FUNNEL_COLUMNS.map(({ key }) => {
              if (key in SYNTHETIC_INFO) {
                const info = SYNTHETIC_INFO[key as SyntheticKey];
                return (
                  <div key={key} className="rounded-lg bg-slate-50 p-2.5">
                    <div className="mb-2 flex items-center gap-1.5 px-0.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: info.color }} />
                      <span className="text-xs font-semibold text-slate-500">{info.label}</span>
                    </div>
                    <div className="rounded-lg border border-dashed border-slate-200 p-2.5 text-center text-[11px] text-slate-300">
                      {t.notTracked}
                    </div>
                  </div>
                );
              }
              const metricKey = key as HistoryMetric;
              const col = byMetric.get(metricKey)!;
              const colLabel = labels[metricKey];
              const leads = period.leads[metricKey];
              const droppable = Boolean(DROPPABLE_ACTION[metricKey]);
              return (
                <div
                  key={metricKey}
                  onDragOver={
                    droppable
                      ? (e) => {
                          e.preventDefault();
                          setDragOverKey(metricKey);
                        }
                      : undefined
                  }
                  onDragLeave={droppable ? () => setDragOverKey((k) => (k === metricKey ? null : k)) : undefined}
                  onDrop={
                    droppable
                      ? (e) => {
                          e.preventDefault();
                          const leadId = e.dataTransfer.getData("text/plain");
                          if (leadId) handleDrop(leadId, metricKey);
                        }
                      : undefined
                  }
                  className={`flex flex-col rounded-lg bg-slate-50 p-2.5 transition ${
                    dragOverKey === metricKey ? "ring-2 ring-cyan-400 bg-cyan-50/60" : ""
                  }`}
                >
                  <div className="mb-2 flex items-center gap-1.5 px-0.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-xs font-semibold text-slate-500">{colLabel}</span>
                    <span className="ml-auto rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                      {leads.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {leads.length === 0 && (
                      <div className="rounded-md border border-dashed border-slate-200 py-2 text-center text-[10px] text-slate-300">
                        {t.empty}
                      </div>
                    )}
                    {leads.map((lead) => (
                      <HistoryBoardCard
                        key={lead.id}
                        lead={lead}
                        categoryLabel={colLabel}
                        categoryColor={col.color}
                        draggable={droppable}
                        onOpen={onOpen}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function KanbanHistoryPage() {
  const { locale, t } = useLanguage();
  const [grouping, setGrouping] = useState<Grouping>("daily");
  const [history, setHistory] = useState<DayEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedLead | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 3000);
  }, []);

  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    return fetch("/api/reports/kanban-history?days=60")
      .then((r) => r.json())
      .then((d) => setHistory(d.series))
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="reports" />
      <div className="flex flex-1 flex-col overflow-hidden p-6">
        <h1 className="mb-1 text-lg font-bold text-slate-900">{t.salesReportTitle}</h1>
        <p className="mb-4 text-sm text-slate-500">
          {t.kanbanDailyDesc1}
          <strong>{t.kanbanDailyDescEvent}</strong>
          {t.kanbanDailyDesc2}
          <a href="/reports/overview" className="text-cyan-700 hover:underline">
            {t.kanbanDailyOverviewLink}
          </a>
          .
        </p>
        <ReportsTabs />
        <KanbanSubNav active="history" />

        <div className="mb-4 flex w-fit gap-1 rounded-lg bg-slate-100 p-1">
          {([
            ["daily", t.tabPerDay],
            ["weekly", t.tabPerWeek],
          ] as [Grouping, string][]).map(([g, label]) => (
            <button
              key={g}
              onClick={() => setGrouping(g)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                grouping === g ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="mb-3 text-xs text-slate-400">{t.kanbanDailyFootnote}</p>

        <div className="flex-1 overflow-y-auto pb-4">
          {historyLoading && <div className="text-sm text-slate-400">{t.loading}</div>}
          {!historyLoading &&
            history &&
            (grouping === "daily" ? toPeriods(history, locale) : groupWeekly(history, locale)).map((period) => (
              <PeriodBoard key={period.key} period={period} onMoved={loadHistory} onOpen={setSelected} onDropError={showToast} />
            ))}
        </div>
      </div>
      {selected && <LeadPopup selection={selected} onClose={() => setSelected(null)} onMoved={loadHistory} />}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
