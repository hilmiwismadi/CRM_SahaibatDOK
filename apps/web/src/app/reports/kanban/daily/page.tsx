"use client";

import { useEffect, useState } from "react";
import AppSidebar from "@/app/components/AppSidebar";
import ReportsTabs from "../../ReportsTabs";
import {
  type DayEntry,
  type SelectedLead,
  HISTORY_COLUMNS,
  HistoryLeadCard,
  LeadPopup,
  KanbanSubNav,
  toPeriods,
  groupWeekly,
} from "../shared";

type Grouping = "daily" | "weekly";

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
        <p className="mb-4 text-sm text-slate-500">Riwayat kapan setiap lead pertama kali masuk ke tiap kategori.</p>
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
            bukan snapshot total saat ini. Kategori tag (Tidak Ada Kontak WA, Appointment, Reject, Further Contact,
            Follow Up) hanya tercatat sejak fitur ini aktif; hari-hari sebelumnya akan tampak 0 meski lead sudah
            ditandai duluan.
          </p>
          {historyLoading && <div className="text-sm text-slate-400">Loading…</div>}
          {!historyLoading && history && (
            <>
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
      </div>
      {selected && <LeadPopup selection={selected} onClose={() => setSelected(null)} onMoved={() => {}} />}
    </div>
  );
}
