"use client";

import { useEffect, useState } from "react";

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
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold mb-1">Scrape Jobs</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Run a scrape with <code>scripts/run-scrape.ps1</code> (see{" "}
        <code>docs/SCRAPER_GUIDE.md</code>), then import the resulting file
        from <code>scrape-output/</code> here.
      </p>

      <form onSubmit={handleImport} className="mb-8 flex flex-col gap-3 rounded border p-4">
        <label className="flex flex-col gap-1 text-sm">
          File name (in scrape-output/)
          <input
            className="rounded border px-2 py-1"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="yogyakarta-dokter-praktik-mandiri.json"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Query text (for the job record)
          <input
            className="rounded border px-2 py-1"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="dokter praktik mandiri Yogyakarta"
            required
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {busy ? "Importing…" : "Import"}
        </button>
        {message && <p className="text-sm">{message}</p>}
      </form>

      <h2 className="text-lg font-semibold mb-2">Recent jobs</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-zinc-500">
            <th className="pb-2">Query</th>
            <th className="pb-2">Status</th>
            <th className="pb-2">Raw</th>
            <th className="pb-2">New</th>
            <th className="pb-2">Updated</th>
            <th className="pb-2">Started</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-t">
              <td className="py-2">{job.queryText}</td>
              <td className="py-2">{job.status}</td>
              <td className="py-2">{job.rawResultCount ?? "-"}</td>
              <td className="py-2">{job.newLeadCount ?? "-"}</td>
              <td className="py-2">{job.updatedLeadCount ?? "-"}</td>
              <td className="py-2">{new Date(job.startedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
