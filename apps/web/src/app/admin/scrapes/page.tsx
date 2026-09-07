"use client";

import { useEffect, useState } from "react";
import AppSidebar from "@/app/components/AppSidebar";

interface ScrapeJob {
  id: string;
  queryText: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  rawResultCount: number | null;
  newLeadCount: number | null;
  updatedLeadCount: number | null;
}

export default function ScrapesAdminPage() {
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [fileName, setFileName] = useState("");
  const [queryText, setQueryText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadJobs() {
    const res = await fetch("/api/scrape-jobs");
    const data = await res.json();
    setJobs(data.jobs ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/scrape-jobs")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setJobs(data.jobs ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/import-staging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, queryText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Error: ${JSON.stringify(data.error ?? data)}`);
      } else {
        setMessage(
          `Imported "${fileName}" — scanned ${data.mergeSummary.scannedCount}, new ${data.mergeSummary.newCount}, updated ${data.mergeSummary.updatedCount}, skipped ${data.mergeSummary.skippedCount}.`,
        );
        setFileName("");
        setQueryText("");
        await loadJobs();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="scrapes" />

      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="mb-1 text-lg font-bold text-slate-900">Scrape Jobs</h1>
        <p className="mb-6 text-sm text-slate-500">
          Run a scrape with <code className="rounded bg-slate-100 px-1 py-0.5">scripts/run-scrape.ps1</code> (see{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5">docs/SCRAPER_GUIDE.md</code>), then import the resulting
          file from <code className="rounded bg-slate-100 px-1 py-0.5">scrape-output/</code> here.
        </p>

        <form onSubmit={handleImport} className="mb-8 max-w-xl rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">File name (in scrape-output/)</label>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="yogyakarta-dokter-praktik-mandiri.json"
              required
            />
          </div>
          <div className="mb-4 flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Query text (for the job record)</label>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="dokter praktik mandiri Yogyakarta"
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 active:scale-95 disabled:opacity-50"
          >
            {busy ? "Importing…" : "Import"}
          </button>
          {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
        </form>

        <h2 className="mb-2 text-sm font-semibold text-slate-900">Recent jobs</h2>
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          {jobs.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">No scrape jobs yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Query</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Raw</th>
                  <th className="px-4 py-2.5 font-medium">New</th>
                  <th className="px-4 py-2.5 font-medium">Updated</th>
                  <th className="px-4 py-2.5 font-medium">Started</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{job.queryText}</td>
                    <td className="px-4 py-2.5 text-slate-500">{job.status}</td>
                    <td className="px-4 py-2.5 text-slate-500">{job.rawResultCount ?? "-"}</td>
                    <td className="px-4 py-2.5 text-slate-500">{job.newLeadCount ?? "-"}</td>
                    <td className="px-4 py-2.5 text-slate-500">{job.updatedLeadCount ?? "-"}</td>
                    <td className="px-4 py-2.5 text-slate-400">{new Date(job.startedAt).toLocaleString("id-ID")}</td>
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
