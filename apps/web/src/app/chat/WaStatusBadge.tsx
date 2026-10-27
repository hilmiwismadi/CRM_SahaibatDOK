"use client";

import { useEffect, useState } from "react";

export default function WaStatusBadge() {
  const [status, setStatus] = useState<{ connected: boolean; hasQr: boolean } | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [resyncState, setResyncState] = useState<"idle" | "running" | "done" | "error">("idle");

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/wa/status", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setStatus({ connected: false, hasQr: false });
      }
    }
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!showQr) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    async function fetchQr() {
      try {
        const res = await fetch("/api/wa/qr", { cache: "no-store" });
        if (res.headers.get("content-type")?.includes("image")) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          objectUrl = url;
          setQrUrl(url);
        } else if (!cancelled) {
          setQrUrl(null);
        }
      } catch {
        // ignore — next poll tick will retry
      }
    }

    fetchQr();
    const id = setInterval(fetchQr, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [showQr]);

  const connected = status?.connected ?? false;

  async function handleResync() {
    setResyncState("running");
    try {
      const res = await fetch("/api/wa/resync", { method: "POST" });
      const data = await res.json();
      setResyncState(res.ok && data.ran ? "done" : "error");
    } catch {
      setResyncState("error");
    }
    setTimeout(() => setResyncState("idle"), 4000);
  }

  return (
    <>
      <button
        onClick={() => setShowQr(true)}
        aria-label={connected ? "WhatsApp connected" : "Not connected"}
        className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 active:scale-95 max-md:min-h-[40px] max-md:shrink-0"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${connected ? "bg-emerald-500" : "bg-red-400"}`} />
        {/* Phones: short label, the dot carries the status. */}
        <span className="md:hidden">WA</span>
        <span className="max-md:hidden">{connected ? "WhatsApp connected" : "Not connected"}</span>
      </button>

      {showQr && (
        <div
          onClick={() => setShowQr(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 max-md:z-[100]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-80 rounded-2xl bg-white p-6 text-center shadow-2xl max-md:max-h-[90dvh] max-md:w-full max-md:max-w-80 max-md:overflow-y-auto max-md:p-5"
          >
            <h2 className="mb-1 text-sm font-bold text-slate-900">
              {connected ? "WhatsApp Connected" : "Scan to connect WhatsApp"}
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              {connected ? "This device is linked and ready." : "WhatsApp → Linked Devices → Link a Device"}
            </p>

            {!connected &&
              (qrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived blob: URL, not an optimizable asset
                <img src={qrUrl} alt="WhatsApp pairing QR code" className="mx-auto rounded-lg border border-slate-100 max-md:h-auto max-md:max-w-full" />
              ) : (
                <div className="flex h-64 items-center justify-center text-xs text-slate-400">Loading QR…</div>
              ))}

            {connected && (
              <>
                <div className="flex h-24 items-center justify-center text-4xl">✅</div>
                <button
                  onClick={handleResync}
                  disabled={resyncState === "running"}
                  className="mb-1 w-full rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 max-md:min-h-[44px] max-md:text-sm"
                >
                  {resyncState === "running"
                    ? "Resyncing…"
                    : resyncState === "done"
                      ? "Resync done ✓"
                      : resyncState === "error"
                        ? "Resync failed — try again"
                        : "Resync Contacts"}
                </button>
                <p className="mb-3 text-[11px] text-slate-400">
                  Re-links leads to WhatsApp after re-pairing (e.g. new device/session). Run after scanning a new QR.
                </p>
              </>
            )}

            <button
              onClick={() => setShowQr(false)}
              className="mt-4 rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-200 max-md:min-h-[44px] max-md:w-full max-md:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
