"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppSidebar from "@/app/components/AppSidebar";

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

interface SalesSummary {
  totalLeads: number;
  stages: StageStat[];
  followUps: {
    trialCheckinOverdue: TrialOverdueLead[];
    staleLeads: StaleLead[];
  };
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reports/sales-summary")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSummary(data);
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
        <p className="mb-6 text-sm text-slate-500">Pipeline overview and follow-ups due.</p>

        {loading && <div className="text-sm text-slate-400">Loading…</div>}

        {summary && (
          <>
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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

            <div className="grid gap-6 lg:grid-cols-2">
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
