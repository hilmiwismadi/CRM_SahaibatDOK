"use client";

import { useEffect, useRef, useState } from "react";
import AppSidebar from "@/app/components/AppSidebar";
import SyncTabs from "../SyncTabs";

interface CsvRow {
  name: string;
  specialty: string;
  city: string;
  province: string;
  phone: string;
  cityUnresolved: boolean;
}

interface LeadInputResponse {
  date: string;
  count: number;
  unresolvedCityCount: number;
  rows: CsvRow[];
  csv: string;
}

function todayWibString(): string {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

export default function LeadInputPage() {
  const [date, setDate] = useState(todayWibString());
  const [data, setData] = useState<LeadInputResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const csvRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLoading(true);
    setCopied(false);
    fetch(`/api/sync/leadinput?date=${date}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [date]);

  // navigator.clipboard needs a secure context (HTTPS or localhost) — this
  // app is served plain HTTP on the VPS's bare IP (no domain/TLS set up),
  // where that API is simply absent, so a clipboard.writeText-only version
  // fails silently there (see /sync/dailylog's Copy script button, same
  // bug, fixed 2026-10-01). Falls back to select()+execCommand("copy"),
  // which works over plain HTTP.
  async function copyCsv() {
    if (!data) return;
    setCopyError(false);
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(data.csv);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        // fall through to the legacy path below
      }
    }
    const el = csvRef.current;
    if (!el) {
      setCopyError(true);
      return;
    }
    el.focus();
    el.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyError(true);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="sync" />
      <div className="flex-1 overflow-y-auto px-3 pb-6 md:p-6">
        <h1 className="mt-3 mb-1 text-lg font-bold text-slate-900 md:mt-0">CRM Sync</h1>
        <p className="mb-4 text-sm text-slate-500">
          Bikin CSV lead baru untuk di-paste ke &quot;Import candidates (CSV)&quot; di sales.sahaibat.com/lead-engine.
        </p>
        <SyncTabs />

        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <label className="flex items-center text-sm font-medium text-slate-600 md:block">
            Tanggal
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="ml-2 h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm md:h-auto md:flex-none"
            />
          </label>
          {data && (
            <span className="text-sm text-slate-500">
              {data.count} lead dichat tanggal ini
              {data.unresolvedCityCount > 0 && (
                <span className="ml-2 text-amber-600">
                  · {data.unresolvedCityCount} baris tanpa city (cek manual di tabel di bawah)
                </span>
              )}
            </span>
          )}
        </div>

        {loading && <div className="text-sm text-slate-400">Memuat…</div>}

        {!loading && data && data.count === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            Tidak ada aktivitas WA pada tanggal ini.
          </div>
        )}

        {!loading && data && data.count > 0 && (
          <>
            {/* Sticky on phones so "Copy CSV" stays reachable while scrolling the preview. */}
            <div className="sticky top-0 z-10 -mx-3 mb-2 flex items-center justify-between gap-3 bg-[#f7f8fa] px-3 py-2 md:static md:mx-0 md:gap-0 md:bg-transparent md:p-0">
              <div className="min-w-0 text-sm font-semibold text-slate-700">CSV (siap paste ke /lead-engine)</div>
              <button
                onClick={copyCsv}
                className="h-11 shrink-0 rounded-lg bg-cyan-600 px-4 text-sm font-semibold text-white hover:bg-cyan-700 md:h-auto md:px-3 md:py-1.5 md:font-medium"
              >
                {copied ? "Tersalin ✓" : "Copy CSV"}
              </button>
            </div>
            {copyError && (
              <div className="mb-2 text-xs text-amber-600">
                Tidak bisa copy otomatis di browser ini — teksnya sudah ke-select di bawah, tekan Ctrl+C (atau Cmd+C) manual.
              </div>
            )}
            <textarea
              ref={csvRef}
              readOnly
              value={data.csv}
              rows={8}
              className="mb-6 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-700"
              onFocus={(e) => e.currentTarget.select()}
            />

            <div className="text-sm font-semibold text-slate-700">Preview ({data.rows.length} baris)</div>
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {/* Phones: one card per row instead of a 5-column table. */}
              <ul className="divide-y divide-slate-100 md:hidden">
                {data.rows.map((r) => (
                  <li key={r.phone} className="px-3 py-2.5 text-sm">
                    <div className="font-medium break-words text-slate-800">{r.name}</div>
                    {r.specialty && <div className="text-xs break-words text-slate-500">{r.specialty}</div>}
                    <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
                      <span className={r.cityUnresolved ? "font-medium text-amber-600" : "text-slate-600"}>
                        {r.city || "(kosong — perlu diisi manual)"}
                        {r.province && <span className="text-slate-400"> · {r.province}</span>}
                      </span>
                      <span className="text-slate-400">{r.phone}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <table className="hidden w-full text-sm md:table">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Nama</th>
                    <th className="px-3 py-2">Specialty</th>
                    <th className="px-3 py-2">City</th>
                    <th className="px-3 py-2">Province</th>
                    <th className="px-3 py-2">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.phone} className="border-t border-slate-100">
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2 text-slate-500">{r.specialty}</td>
                      <td className={`px-3 py-2 ${r.cityUnresolved ? "text-amber-600" : ""}`}>
                        {r.city || "(kosong — perlu diisi manual)"}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{r.province}</td>
                      <td className="px-3 py-2 text-slate-500">{r.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
