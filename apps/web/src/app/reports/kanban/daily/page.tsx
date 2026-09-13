"use client";

import { useEffect, useState } from "react";
import AppSidebar from "@/app/components/AppSidebar";
import ReportsTabs from "../../ReportsTabs";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/leadSegmentation";
import {
  type DayEntry,
  type HistoryMetric,
  type SelectedLead,
  HISTORY_COLUMNS,
  HistoryLeadCard,
  LeadPopup,
  KanbanSubNav,
  toPeriods,
  groupWeekly,
} from "../shared";

type Grouping = "daily" | "weekly";

const byMetric = new Map(HISTORY_COLUMNS.map((c) => [c.key, c]));

// Same left-to-right story as /reports/overview's funnel, but for *events*
// instead of current state: did we even reach them, then — for the ones
// who haven't given a real answer yet — did a bot field it or is it just
// sitting unclassified, then the two "needs more from us" tags, then the
// two definitive outcomes. "On Going" has no card here on purpose: it's
// leadSegmentation's fallback ("active") for whatever doesn't match any
// tag, not something anyone ever *sets* — there's no tag_change event to
// count, so showing a number for it would be making one up. See
// /reports/overview for its current (not historical) count instead.
const STANDALONE: HistoryMetric[] = ["untouchedToTouched", "noWaAccount"];
const GROUPS: { label: string; metrics: HistoryMetric[]; hasOnGoing?: boolean }[] = [
  { label: "Belum Dijawab", metrics: ["repliedByBot"], hasOnGoing: true },
  { label: "Perlu Lanjutan", metrics: ["needsFollowUp", "needsOtherContact"] },
  { label: "Jawaban Pasti", metrics: ["appointment", "declined"] },
];

function StatCard({ label, count, color }: { label: string; count: number | null; color: string }) {
  return (
    <div className="rounded-xl border p-3" style={{ backgroundColor: count === null ? undefined : `${color}12`, borderColor: `${color}33` }}>
      <div className="text-xl font-bold" style={{ color }}>
        {count === null ? "—" : count}
      </div>
      <div className="text-xs font-medium" style={{ color }}>
        {label}
      </div>
    </div>
  );
}

export default function KanbanHistoryPage() {
  const [grouping, setGrouping] = useState<Grouping>("daily");
  const [history, setHistory] = useState<DayEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedLead | null>(null);

  useEffect(() => {
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
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="reports" />
      <div className="flex flex-1 flex-col overflow-hidden p-6">
        <h1 className="mb-1 text-lg font-bold text-slate-900">Sales report</h1>
        <p className="mb-4 text-sm text-slate-500">
          Riwayat <strong>event</strong> (kapan sesuatu ditandai) — bukan jumlah saat ini. Untuk status hari ini, lihat{" "}
          <a href="/reports/overview" className="text-cyan-700 hover:underline">
            Overview
          </a>
          .
        </p>
        <ReportsTabs />
        <KanbanSubNav active="history" />

        <div className="mb-4 flex w-fit gap-1 rounded-lg bg-slate-100 p-1">
          {([
            ["daily", "Per Tanggal"],
            ["weekly", "Per Minggu"],
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

        <div className="flex flex-1 flex-col overflow-hidden">
          <p className="mb-3 text-xs text-slate-400">
            Jumlah lead yang <strong>baru</strong> masuk ke kategori tersebut pada {grouping === "daily" ? "tanggal" : "minggu"} itu —
            bukan snapshot total saat ini. &ldquo;Tidak Ada Kontak WA&rdquo; di sini hanya menghitung yang ditandai manual lewat
            dashboard — kegagalan otomatis saat kirim pesan tidak melewati jalur yang tercatat, jadi angkanya akan jauh
            lebih kecil dari total di Overview. Kategori tag lain juga hanya tercatat sejak fitur ini aktif; hari-hari
            sebelumnya akan tampak 0 meski lead sudah ditandai duluan.
          </p>
          {historyLoading && <div className="text-sm text-slate-400">Loading…</div>}
          {!historyLoading && history && (
            <>
              {/* Totals across the loaded 60-day window. */}
              <div className="mb-4 flex flex-wrap gap-3">
                {STANDALONE.map((key) => {
                  const col = byMetric.get(key)!;
                  const total = history.reduce((sum, d) => sum + d.counts[key], 0);
                  return <StatCard key={key} label={col.label} count={total} color={col.color} />;
                })}
                {GROUPS.map((group) => (
                  <div key={group.label} className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-3">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{group.label}</div>
                    <div className="flex gap-2">
                      {group.metrics.map((key) => {
                        const col = byMetric.get(key)!;
                        const total = history.reduce((sum, d) => sum + d.counts[key], 0);
                        return <StatCard key={key} label={col.label} count={total} color={col.color} />;
                      })}
                      {group.hasOnGoing && (
                        <StatCard label={`${CATEGORY_LABELS.active} (On Going)`} count={null} color={CATEGORY_COLORS.active} />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* One card per period, columns = categories holding the
                  actual leads (not just a count) — matches CRM_Grad's
                  SalesReport.tsx layout: a period card with a colored
                  pill header per category and a numbered list underneath. */}
              <div className="flex-1 overflow-y-auto pb-4">
                {(grouping === "daily" ? toPeriods(history) : groupWeekly(history)).map((period) => {
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
                        <div className="flex flex-wrap gap-4 p-4">
                          {STANDALONE.map((key) => (
                            <PeriodMetric key={key} col={byMetric.get(key)!} leads={period.leads[key]} onOpen={setSelected} />
                          ))}
                          {GROUPS.map((group) => (
                            <div key={group.label} className="rounded-xl border border-dashed border-slate-200 p-3">
                              <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{group.label}</div>
                              <div className="flex flex-wrap gap-4">
                                {group.metrics.map((key) => (
                                  <PeriodMetric key={key} col={byMetric.get(key)!} leads={period.leads[key]} onOpen={setSelected} />
                                ))}
                                {group.hasOnGoing && (
                                  <div className="w-32">
                                    <span className="mb-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                                      On Going (—)
                                    </span>
                                    <div className="mt-1 text-[11px] italic text-slate-300">Tidak terlacak per-hari</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      {selected && <LeadPopup selection={selected} onClose={() => setSelected(null)} onMoved={() => {}} />}
    </div>
  );
}

function PeriodMetric({
  col,
  leads,
  onOpen,
}: {
  col: { key: HistoryMetric; label: string; color: string };
  leads: { id: string; name: string }[];
  onOpen: (s: SelectedLead) => void;
}) {
  return (
    <div className="w-32">
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
            <HistoryLeadCard key={l.id} lead={l} index={i} categoryLabel={col.label} categoryColor={col.color} onOpen={onOpen} />
          ))}
          {leads.length > 5 && <div className="px-1.5 text-[10px] text-slate-400">+{leads.length - 5} lainnya</div>}
        </div>
      )}
    </div>
  );
}
