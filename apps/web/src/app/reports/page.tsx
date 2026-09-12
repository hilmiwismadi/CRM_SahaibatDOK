"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppSidebar from "@/app/components/AppSidebar";
import ReportsTabs from "./ReportsTabs";
import type { LeadCategory } from "@/lib/leadSegmentation";

interface StageStat {
  key: string;
  count: number;
  label: string;
  color: string;
  isTerminal: boolean;
}

interface TrialOverdueLead {
  id: string;
  name: string;
  trialStartedAt: string | null;
  trialHealthUpdatedAt: string | null;
}

interface StaleLead {
  id: string;
  name: string;
  pipelineStage: string;
  updatedAt: string;
}

interface GhostedLead {
  id: string;
  name: string;
  pipelineStage: string;
  lastOutboundAt: string;
}

interface SalesSummary {
  totalLeads: number;
  stages: StageStat[];
  kpi: {
    totalActiveConversations: number;
    needsReplyCount: number;
    unreachableCount: number;
    responseRate: number;
  };
  reachability: {
    total: number;
    reachable: number;
    noPhone: number;
    noWaAccount: number;
  };
  tags: {
    needsReply: number;
    repliedByBot: number;
    needsOtherContact: number;
    needsFollowUp: number;
    noWaAccount: number;
  };
  followUps: {
    trialCheckinOverdue: TrialOverdueLead[];
    staleLeads: StaleLead[];
    ghostedLeads: GhostedLead[];
  };
}

interface ChatActivityDay {
  date: string;
  outbound: number;
  inbound: number;
  contactsReached: number;
}

interface SegmentationLead {
  id: string;
  name: string;
}

interface Segmentation {
  total: number;
  untouched: { count: number; leads: SegmentationLead[] };
  touched: {
    count: number;
    categories: { key: LeadCategory; label: string; count: number; leads: SegmentationLead[] }[];
  };
}

const TAG_CARDS = [
  { key: "needsReply", label: "Belum Dibalas", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  { key: "repliedByBot", label: "Dibalas Bot", bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  { key: "needsOtherContact", label: "Perlu Kontak Lain", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  { key: "needsFollowUp", label: "Butuh Follow Up", bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  { key: "noWaAccount", label: "Tidak Ada Kontak WA", bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" },
] as const;

function ChatActivityChart({ days }: { days: ChatActivityDay[] }) {
  const max = Math.max(1, ...days.map((d) => Math.max(d.outbound, d.inbound)));

  return (
    <div className="overflow-x-auto">
      <div className="flex h-40 items-end gap-1" style={{ minWidth: days.length * 26 }}>
        {days.map((d) => {
          const dateObj = new Date(`${d.date}T00:00:00Z`);
          const label = dateObj.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
          return (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1" style={{ minWidth: 22 }}>
              <div className="flex h-32 items-end gap-0.5">
                <div
                  title={`${label}: ${d.outbound} terkirim`}
                  className="w-2 rounded-t bg-cyan-500"
                  style={{ height: `${(d.outbound / max) * 100}%`, minHeight: d.outbound > 0 ? 2 : 0 }}
                />
                <div
                  title={`${label}: ${d.inbound} masuk`}
                  className="w-2 rounded-t bg-violet-400"
                  style={{ height: `${(d.inbound / max) * 100}%`, minHeight: d.inbound > 0 ? 2 : 0 }}
                />
              </div>
              <div className="text-[9px] text-slate-400" style={{ writingMode: "vertical-rl" }}>
                {label}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-500" /> Terkirim
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-400" /> Masuk
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [activity, setActivity] = useState<ChatActivityDay[]>([]);
  const [segmentation, setSegmentation] = useState<Segmentation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/reports/sales-summary").then((r) => r.json()),
      fetch("/api/reports/chat-activity?days=30").then((r) => r.json()),
      fetch("/api/reports/segmentation").then((r) => r.json()),
    ])
      .then(([summaryData, activityData, segmentationData]) => {
        if (cancelled) return;
        setSummary(summaryData);
        setActivity(activityData.series ?? []);
        setSegmentation(segmentationData);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="reports" />
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="mb-1 text-lg font-bold text-slate-900">Sales report</h1>
        <p className="mb-4 text-sm text-slate-500">Pipeline overview, aktivitas chat, dan status kontak WA.</p>
        <ReportsTabs />

        {loading && <div className="text-sm text-slate-400">Loading…</div>}

        {summary && (
          <>
            {/* Pipeline stage counts */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <div className="text-2xl font-bold text-slate-900">{summary.totalLeads}</div>
                <div className="text-xs text-slate-400">Total leads</div>
              </div>
              {summary.stages.map((s) => (
                <div key={s.key} className="rounded-xl border border-slate-100 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <div className="text-2xl font-bold text-slate-900">{s.count}</div>
                  </div>
                  <div className="text-xs text-slate-400">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Expanded KPI row */}
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <div className="text-2xl font-bold text-slate-900">{summary.kpi.totalActiveConversations}</div>
                <div className="text-xs text-slate-400">Total percakapan aktif</div>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
                <div className="text-2xl font-bold text-red-700">{summary.kpi.needsReplyCount}</div>
                <div className="text-xs text-red-500">Belum dibalas</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-2xl font-bold text-gray-700">{summary.kpi.unreachableCount}</div>
                <div className="text-xs text-gray-500">Tidak bisa dikontak WA</div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="text-2xl font-bold text-emerald-700">
                  {(summary.kpi.responseRate * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-emerald-600">Response rate</div>
              </div>
            </div>

            {/* Segmentasi Leads — funnel */}
            {segmentation && (
              <div className="mb-6 rounded-xl border border-slate-100 bg-white p-4">
                <h2 className="mb-1 text-sm font-semibold text-slate-900">Segmentasi Leads</h2>
                <p className="mb-3 text-xs text-slate-400">
                  &ldquo;Disentuh&rdquo; = pernah dihubungi (kirim pesan berhasil/gagal) — bukan sekadar dilihat di dashboard.
                </p>
                <div className="mb-4 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xl font-bold text-slate-900">{segmentation.total}</div>
                    <div className="text-xs text-slate-500">Total leads</div>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-3">
                    <div className="text-xl font-bold text-slate-700">{segmentation.untouched.count}</div>
                    <div className="text-xs text-slate-500">
                      Belum Disentuh ({segmentation.total > 0 ? ((segmentation.untouched.count / segmentation.total) * 100).toFixed(0) : 0}%)
                    </div>
                  </div>
                  <div className="rounded-lg bg-cyan-50 p-3">
                    <div className="text-xl font-bold text-cyan-700">{segmentation.touched.count}</div>
                    <div className="text-xs text-cyan-600">
                      Sudah Disentuh ({segmentation.total > 0 ? ((segmentation.touched.count / segmentation.total) * 100).toFixed(0) : 0}%)
                    </div>
                  </div>
                </div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Breakdown dari yang Sudah Disentuh
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                  {segmentation.touched.categories.map((c) => (
                    <div key={c.key} className="rounded-lg border border-slate-100 p-3">
                      <div className="text-lg font-bold text-slate-900">{c.count}</div>
                      <div className="text-xs text-slate-500">{c.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat activity per date */}
            <div className="mb-6 rounded-xl border border-slate-100 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Aktivitas chat (30 hari terakhir)</h2>
              {activity.length === 0 ? (
                <div className="text-sm text-slate-400">Belum ada aktivitas.</div>
              ) : (
                <>
                  <ChatActivityChart days={activity} />
                  <div className="mt-4 max-h-56 overflow-y-auto rounded-lg border border-slate-100">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-50">
                        <tr className="text-left text-slate-500">
                          <th className="px-3 py-2 font-medium">Tanggal</th>
                          <th className="px-3 py-2 font-medium">Orang Dikontak</th>
                          <th className="px-3 py-2 font-medium">Pesan Terkirim</th>
                          <th className="px-3 py-2 font-medium">Pesan Masuk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...activity]
                          .reverse()
                          .map((d) => (
                            <tr key={d.date} className="border-t border-slate-50">
                              <td className="px-3 py-1.5 text-slate-700">
                                {new Date(`${d.date}T00:00:00Z`).toLocaleDateString("id-ID", {
                                  weekday: "short",
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </td>
                              <td className="px-3 py-1.5 font-medium text-slate-900">{d.contactsReached}</td>
                              <td className="px-3 py-1.5 text-slate-500">{d.outbound}</td>
                              <td className="px-3 py-1.5 text-slate-500">{d.inbound}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              {/* Tag status breakdown */}
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Status tag</h2>
                <div className="flex flex-col gap-2">
                  {TAG_CARDS.map((t) => (
                    <div key={t.key} className={`flex items-center justify-between rounded-lg px-3 py-2 ${t.bg}`}>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                        <span className={`text-sm font-medium ${t.text}`}>{t.label}</span>
                      </div>
                      <span className={`text-sm font-bold ${t.text}`}>{summary.tags[t.key]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* WA reachability breakdown */}
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Status jangkauan WA</h2>
                <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="bg-cyan-500"
                    style={{ width: `${(summary.reachability.reachable / Math.max(1, summary.reachability.total)) * 100}%` }}
                    title="Bisa dihubungi WA"
                  />
                  <div
                    className="bg-slate-400"
                    style={{ width: `${(summary.reachability.noPhone / Math.max(1, summary.reachability.total)) * 100}%` }}
                    title="Tidak ada nomor"
                  />
                  <div
                    className="bg-[#8B4513]"
                    style={{ width: `${(summary.reachability.noWaAccount / Math.max(1, summary.reachability.total)) * 100}%` }}
                    title="Terkonfirmasi tidak ada WA"
                  />
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-cyan-500" /> Bisa dihubungi WA
                    </span>
                    <span className="font-semibold text-slate-900">{summary.reachability.reachable}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-slate-400" /> Tidak ada nomor
                    </span>
                    <span className="font-semibold text-slate-900">{summary.reachability.noPhone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-[#8B4513]" /> Terkonfirmasi tidak ada WA
                    </span>
                    <span className="font-semibold text-slate-900">{summary.reachability.noWaAccount}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Trial check-ins overdue</h2>
                {summary.followUps.trialCheckinOverdue.length === 0 && (
                  <div className="text-sm text-slate-400">Nothing overdue.</div>
                )}
                <ul className="flex flex-col gap-2">
                  {summary.followUps.trialCheckinOverdue.map((l) => (
                    <li key={l.id}>
                      <Link href={`/leads/${l.id}/contacts`} className="text-sm font-medium text-cyan-700 hover:underline">
                        {l.name}
                      </Link>
                      <div className="text-xs text-slate-400">
                        Last checked:{" "}
                        {l.trialHealthUpdatedAt
                          ? new Date(l.trialHealthUpdatedAt).toLocaleDateString("id-ID")
                          : "never"}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Stale leads (14+ days untouched)</h2>
                {summary.followUps.staleLeads.length === 0 && (
                  <div className="text-sm text-slate-400">Nothing stale.</div>
                )}
                <ul className="flex flex-col gap-2">
                  {summary.followUps.staleLeads.map((l) => (
                    <li key={l.id}>
                      <Link href={`/leads/${l.id}/contacts`} className="text-sm font-medium text-cyan-700 hover:underline">
                        {l.name}
                      </Link>
                      <div className="text-xs text-slate-400">
                        Stage: {l.pipelineStage} · Last updated {new Date(l.updatedAt).toLocaleDateString("id-ID")}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">
                  Belum ada balasan (7+ hari)
                </h2>
                {summary.followUps.ghostedLeads.length === 0 && (
                  <div className="text-sm text-slate-400">Semua sudah dibalas atau baru dihubungi.</div>
                )}
                <ul className="flex flex-col gap-2">
                  {summary.followUps.ghostedLeads.map((l) => (
                    <li key={l.id}>
                      <Link href={`/chat?leadId=${l.id}`} className="text-sm font-medium text-cyan-700 hover:underline">
                        {l.name}
                      </Link>
                      <div className="text-xs text-slate-400">
                        Stage: {l.pipelineStage} · Terakhir dikirim {new Date(l.lastOutboundAt).toLocaleDateString("id-ID")}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
