"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppSidebar from "@/app/components/AppSidebar";
import ReportsTabs from "../ReportsTabs";
import { categoryLabels } from "@/lib/leadSegmentation";
import { useLanguage } from "@/lib/i18n/context";
import { ACTIVITY_TYPE_LABELS } from "@/lib/i18n/translations";
import { formatDate, formatTime, type Locale } from "@/lib/i18n/locale";
import type { Translations } from "@/lib/i18n/translations";

interface Activity {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  lead: { id: string; name: string } | null;
}

const TYPE_COLORS: Record<string, string> = {
  stage_change: "text-cyan-700 bg-cyan-50",
  wa_message_sent: "text-emerald-700 bg-emerald-50",
  wa_message_received: "text-violet-700 bg-violet-50",
  manual_edit: "text-amber-700 bg-amber-50",
  scrape_update: "text-slate-600 bg-slate-100",
  contact_chain_updated: "text-sky-700 bg-sky-50",
  tag_change: "text-fuchsia-700 bg-fuchsia-50",
  replied_marked: "text-rose-700 bg-rose-50",
  note: "text-slate-600 bg-slate-100",
};

// wa_contacts boolean column name -> the same label /chat and /reports use
// for it, so "tag_change" rows read the same word everywhere.
function tagFieldLabels(locale: Locale): Record<string, string> {
  const labels = categoryLabels(locale);
  return {
    noWaAccount: labels.no_wa_account,
    appointment: labels.appointment,
    declined: labels.declined,
    needsOtherContact: labels.needs_other_contact,
    needsFollowUp: labels.needs_follow_up,
  };
}

function describeActivity(a: Activity, locale: Locale, t: Translations): string {
  if (a.type === "stage_change" && a.payload) {
    return `${a.payload.from ?? "?"} → ${a.payload.to ?? "?"}`;
  }
  if (a.type === "tag_change" && a.payload) {
    const tag = typeof a.payload.tag === "string" ? a.payload.tag : "";
    const label = tagFieldLabels(locale)[tag] ?? tag;
    return a.payload.value ? `${label}: ${t.activityTagMarked}` : `${label}: ${t.activityTagCleared}`;
  }
  if (a.type === "replied_marked" && a.payload) {
    if (a.payload.cleared) return t.activityRepliedCleared;
    return a.payload.kind === "bot" ? t.activityRepliedBot : t.activityRepliedManual;
  }
  if (a.type === "wa_message_sent" || a.type === "wa_message_received") {
    return "";
  }
  if (a.type === "manual_edit" && a.payload) {
    if (Array.isArray(a.payload.fields)) return `${t.activityFieldPrefix}: ${(a.payload.fields as string[]).join(", ")}`;
    if (typeof a.payload.action === "string") {
      return a.payload.action === "created_manually" ? t.activityLeadCreatedManually : a.payload.action;
    }
    if (typeof a.payload.note === "string") return a.payload.note;
  }
  return "";
}

export default function HistoryPage() {
  const { locale, t } = useLanguage();
  const TYPE_LABELS = ACTIVITY_TYPE_LABELS[locale];
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [type, setType] = useState("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({ days: String(days) });
    if (type !== "all") qs.set("type", type);
    fetch(`/api/reports/activity-log?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setActivities(d.activities ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, type]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="reports" />
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="mb-1 text-lg font-bold text-slate-900">{t.salesReportTitle}</h1>
        <p className="mb-4 text-sm text-slate-500">{t.historySubtitle}</p>
        <ReportsTabs />

        <div className="mb-4 flex gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500"
          >
            <option value={7}>{t.historyDays7}</option>
            <option value={30}>{t.historyDays30}</option>
            <option value={90}>{t.historyDays90}</option>
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500"
          >
            <option value="all">{t.historyAllTypes}</option>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          {loading && <div className="p-6 text-center text-sm text-slate-400">{t.loading}</div>}
          {!loading && activities.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-400">{t.historyNoActivity}</div>
          )}
          {!loading && activities.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                  <th className="px-4 py-2.5 font-medium">{t.historyColTime}</th>
                  <th className="px-4 py-2.5 font-medium">{t.historyColLead}</th>
                  <th className="px-4 py-2.5 font-medium">{t.historyColType}</th>
                  <th className="px-4 py-2.5 font-medium">{t.historyColDetail}</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-2 text-slate-400">
                      {formatDate(a.createdAt, locale, { dateStyle: "medium" })}{" "}
                      {formatTime(a.createdAt, locale, { timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-2">
                      {a.lead ? (
                        <Link href={`/chat?leadId=${a.lead.id}`} className="font-medium text-cyan-700 hover:underline">
                          {a.lead.name}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[a.type] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {TYPE_LABELS[a.type] ?? a.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500">{describeActivity(a, locale, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
