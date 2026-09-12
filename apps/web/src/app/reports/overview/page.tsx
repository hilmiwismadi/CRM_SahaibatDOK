"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppSidebar from "@/app/components/AppSidebar";
import ReportsTabs from "../ReportsTabs";
import { CATEGORY_COLORS, CATEGORY_LABELS, REPLY_BRANCH_GROUPS, type LeadCategory } from "@/lib/leadSegmentation";

interface Segmentation {
  total: number;
  untouched: { count: number };
  touched: {
    count: number;
    categories: { key: LeadCategory; label: string; count: number }[];
  };
}

// One flat, non-nested card — used both for the standalone top/bottom
// blocks (Tidak Ada Kontak WA, Perlu Diklasifikasi) and for the leaf cards
// inside a branch group below.
function FlowCard({
  label,
  count,
  color,
  size = "md",
}: {
  label: string;
  count: number;
  color: string;
  size?: "md" | "sm";
}) {
  return (
    <div
      className={`rounded-xl border bg-white ${size === "md" ? "p-4" : "p-3"}`}
      style={{ borderColor: `${color}40` }}
    >
      <div className={size === "md" ? "text-2xl font-bold" : "text-xl font-bold"} style={{ color }}>
        {count}
      </div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center py-1 text-slate-300" aria-hidden>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 4v14M6 12l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// The funnel as 4 blocks a rep scans top-to-bottom: a dead end (Tidak Ada
// Kontak WA), the two "did they reply" branches side by side each holding
// their own leaf categories, and the unclassified catch-all at the bottom.
// See leadSegmentation.ts's REPLY_BRANCH_GROUPS for the branch/leaf data
// this reads from — this component doesn't hardcode categories itself so
// it never drifts from what /chat and /reports/kanban show.
function SegmentationFlow({ segmentation }: { segmentation: Segmentation }) {
  const byKey = new Map(segmentation.touched.categories.map((c) => [c.key, c]));
  const get = (key: LeadCategory) => byKey.get(key)?.count ?? 0;

  return (
    <div className="flex flex-col items-stretch gap-1">
      <FlowCard label={CATEGORY_LABELS.no_wa_account} count={get("no_wa_account")} color={CATEGORY_COLORS.no_wa_account} />
      <FlowArrow />

      <div className="grid gap-4 md:grid-cols-2">
        {REPLY_BRANCH_GROUPS.map((branch) => {
          const branchTotal = branch.categories.reduce((sum, k) => sum + get(k), 0);
          return (
            <div key={branch.key} className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-wide text-slate-500">{branch.label}</span>
                <span className="rounded-full bg-white px-2.5 py-1 text-sm font-bold text-slate-700 shadow-sm">
                  {branchTotal}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {branch.categories.map((key) => (
                  <FlowCard key={key} label={CATEGORY_LABELS[key]} count={get(key)} color={CATEGORY_COLORS[key]} size="sm" />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <FlowArrow />
      <FlowCard label={`${CATEGORY_LABELS.active} (On Going)`} count={get("active")} color={CATEGORY_COLORS.active} />
    </div>
  );
}

export default function ReportsOverviewPage() {
  const [segmentation, setSegmentation] = useState<Segmentation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reports/segmentation")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setSegmentation(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const needsReply = segmentation?.touched.categories.find((c) => c.key === "needs_reply")?.count ?? 0;
  const repliedByBot = segmentation?.touched.categories.find((c) => c.key === "replied_by_bot")?.count ?? 0;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="reports" />
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="mb-1 text-lg font-bold text-slate-900">Sales report</h1>
        <p className="mb-4 text-sm text-slate-500">Ke mana leads mengalir, dari yang belum disentuh sampai appointment.</p>
        <ReportsTabs />

        {loading && <div className="text-sm text-slate-400">Loading…</div>}

        {segmentation && (
          <div className="rounded-xl border border-slate-100 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Segmentasi Leads</h2>
                <p className="text-xs text-slate-400">
                  &ldquo;Disentuh&rdquo; = pernah dihubungi (kirim pesan berhasil/gagal) — bukan sekadar dilihat di dashboard.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                  {segmentation.total} total
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                  {segmentation.untouched.count} belum disentuh
                </span>
                <span className="rounded-full bg-cyan-50 px-2.5 py-1 font-medium text-cyan-700">
                  {segmentation.touched.count} sudah disentuh
                </span>
                {needsReply > 0 && (
                  <span className="rounded-full px-2.5 py-1 font-medium" style={{ backgroundColor: `${CATEGORY_COLORS.needs_reply}1a`, color: CATEGORY_COLORS.needs_reply }}>
                    {needsReply} {CATEGORY_LABELS.needs_reply}
                  </span>
                )}
                {repliedByBot > 0 && (
                  <span className="rounded-full px-2.5 py-1 font-medium" style={{ backgroundColor: `${CATEGORY_COLORS.replied_by_bot}1a`, color: CATEGORY_COLORS.replied_by_bot }}>
                    {repliedByBot} {CATEGORY_LABELS.replied_by_bot}
                  </span>
                )}
              </div>
            </div>

            <SegmentationFlow segmentation={segmentation} />

            <div className="mt-5 border-t border-slate-100 pt-4 text-center">
              <Link href="/reports/kanban/overview" className="text-sm font-medium text-cyan-700 hover:underline">
                Lihat per-lead di Kanban board →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
