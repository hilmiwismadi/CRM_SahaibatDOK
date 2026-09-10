"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppSidebar from "@/app/components/AppSidebar";
import ReportsTabs from "../ReportsTabs";

interface Activity {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  lead: { id: string; name: string } | null;
}

const TYPE_LABELS: Record<string, string> = {
  stage_change: "Ganti Stage",
  wa_message_sent: "Pesan Terkirim",
  wa_message_received: "Pesan Masuk",
  manual_edit: "Edit Manual",
  scrape_update: "Update Scrape",
  contact_chain_updated: "Kontak Chain Diubah",
  note: "Catatan",
};

const TYPE_COLORS: Record<string, string> = {
  stage_change: "text-cyan-700 bg-cyan-50",
  wa_message_sent: "text-emerald-700 bg-emerald-50",
  wa_message_received: "text-violet-700 bg-violet-50",
  manual_edit: "text-amber-700 bg-amber-50",
  scrape_update: "text-slate-600 bg-slate-100",
  contact_chain_updated: "text-sky-700 bg-sky-50",
  note: "text-slate-600 bg-slate-100",
};

function describeActivity(a: Activity): string {
  if (a.type === "stage_change" && a.payload) {
    return `${a.payload.from ?? "?"} → ${a.payload.to ?? "?"}`;
  }
  if (a.type === "wa_message_sent" || a.type === "wa_message_received") {
    return "";
  }
  if (a.type === "manual_edit" && a.payload && Array.isArray(a.payload.fields)) {
    return `Field: ${(a.payload.fields as string[]).join(", ")}`;
  }
  return "";
}

export default function HistoryPage() {
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
        <h1 className="mb-1 text-lg font-bold text-slate-900">Sales report</h1>
        <p className="mb-4 text-sm text-slate-500">
          Riwayat aktivitas — kapan lead dikontak, kapan status berubah, dll. Maks. 200 baris terbaru.
        </p>
        <ReportsTabs />

        <div className="mb-4 flex gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500"
          >
            <option value={7}>7 hari terakhir</option>
            <option value={30}>30 hari terakhir</option>
            <option value={90}>90 hari terakhir</option>
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500"
          >
            <option value="all">Semua tipe</option>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          {loading && <div className="p-6 text-center text-sm text-slate-400">Loading…</div>}
          {!loading && activities.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-400">Tidak ada aktivitas di rentang ini.</div>
          )}
          {!loading && activities.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Waktu</th>
                  <th className="px-4 py-2.5 font-medium">Lead</th>
                  <th className="px-4 py-2.5 font-medium">Tipe</th>
                  <th className="px-4 py-2.5 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-2 text-slate-400">
                      {new Date(a.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
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
                    <td className="px-4 py-2 text-slate-500">{describeActivity(a)}</td>
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
