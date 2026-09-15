"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppSidebar from "@/app/components/AppSidebar";
import ReportsTabs from "../ReportsTabs";
import { CATEGORY_COLORS, categoryLabels, REPLY_BRANCH_GROUPS, replyBranchLabel, type LeadCategory } from "@/lib/leadSegmentation";
import { useLanguage } from "@/lib/i18n/context";
import type { Translations } from "@/lib/i18n/translations";

interface Segmentation {
  total: number;
  untouched: { count: number };
  touched: {
    count: number;
    categories: { key: LeadCategory; label: string; count: number }[];
  };
}

// One flat, non-nested card, sized the same everywhere (matching the
// leaf cards inside a branch group below) so nothing — the top totals,
// "Tidak Ada Kontak WA", "Perlu Diklasifikasi" — ends up looking like a
// different tier of information just because of where it sits.
function FlowCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="rounded-xl border bg-white p-3" style={{ borderColor: `${color}40` }}>
      <div className="text-xl font-bold" style={{ color }}>
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

// The funnel as 3 rows a rep scans top-to-bottom: totals + the one dead-end
// category, the two "did they reply" branches side by side each holding
// their own leaf categories, and the two catch-all/needs-a-reply
// categories at the bottom. See leadSegmentation.ts's REPLY_BRANCH_GROUPS
// for the branch/leaf data this reads from — this component doesn't
// hardcode categories itself so it never drifts from what /chat and
// /reports/kanban show.
function SegmentationFlow({ segmentation, locale, t }: { segmentation: Segmentation; locale: "id" | "en"; t: Translations }) {
  const byKey = new Map(segmentation.touched.categories.map((c) => [c.key, c]));
  const get = (key: LeadCategory) => byKey.get(key)?.count ?? 0;
  const labels = categoryLabels(locale);

  return (
    <div className="flex flex-col items-stretch gap-1">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FlowCard label={t.totalLead} count={segmentation.total} color="#64748b" />
        <FlowCard label={t.untouchedLabel} count={segmentation.untouched.count} color="#94a3b8" />
        <FlowCard label={t.touchedLabel} count={segmentation.touched.count} color="#0891b2" />
        <FlowCard label={labels.no_wa_account} count={get("no_wa_account")} color={CATEGORY_COLORS.no_wa_account} />
      </div>
      <FlowArrow />

      <div className="grid gap-4 md:grid-cols-2">
        {REPLY_BRANCH_GROUPS.map((branch) => {
          const branchTotal = branch.categories.reduce((sum, k) => sum + get(k), 0);
          return (
            <div key={branch.key} className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-wide text-slate-500">{replyBranchLabel(branch.key, locale)}</span>
                <span className="rounded-full bg-white px-2.5 py-1 text-sm font-bold text-slate-700 shadow-sm">
                  {branchTotal}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {branch.categories.map((key) => (
                  <FlowCard key={key} label={labels[key]} count={get(key)} color={CATEGORY_COLORS[key]} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <FlowArrow />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <FlowCard label={`${labels.active} ${t.onGoingSuffix}`} count={get("active")} color={CATEGORY_COLORS.active} />
        <FlowCard label={labels.needs_reply} count={get("needs_reply")} color={CATEGORY_COLORS.needs_reply} />
        <FlowCard label={labels.replied_by_bot} count={get("replied_by_bot")} color={CATEGORY_COLORS.replied_by_bot} />
      </div>
    </div>
  );
}

export default function ReportsOverviewPage() {
  const { locale, t } = useLanguage();
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

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="reports" />
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="mb-1 text-lg font-bold text-slate-900">{t.salesReportTitle}</h1>
        <p className="mb-4 text-sm text-slate-500">{t.reportsOverviewSubtitle}</p>
        <ReportsTabs />

        {loading && <div className="text-sm text-slate-400">{t.loading}</div>}

        {segmentation && (
          <div className="rounded-xl border border-slate-100 bg-white p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-900">{t.reportsOverviewHeading}</h2>
              <p className="text-xs text-slate-400">
                {t.reportsOverviewDesc1}
                <strong>{t.reportsOverviewDescNow}</strong>
                {t.reportsOverviewDesc2}
                <Link href="/reports/kanban/daily" className="text-cyan-700 hover:underline">
                  {t.reportsOverviewHistoryLink}
                </Link>
                .
              </p>
            </div>

            <SegmentationFlow segmentation={segmentation} locale={locale} t={t} />

            <div className="mt-5 border-t border-slate-100 pt-4 text-center">
              <Link href="/reports/kanban/overview" className="text-sm font-medium text-cyan-700 hover:underline">
                {t.seePerLeadKanban}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
