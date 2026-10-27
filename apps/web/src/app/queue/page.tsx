"use client";

import { useCallback, useEffect, useState } from "react";
import AppSidebar from "@/app/components/AppSidebar";

interface QueueItem {
  id: string;
  phone: string;
  leadId: string | null;
  leadName: string | null;
  body: string;
  scheduledFor: string;
  status: string;
  reason: string | null;
  lastError: string | null;
  attempts: number;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });

// <input type="datetime-local"> value in the browser's own timezone
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 19);
};

/**
 * Antrean kirim — messages the send guard (lib/sendGuard.ts) is holding back
 * so the account does not send similar / too-frequent messages in a burst.
 */
export default function QueuePage() {
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [when, setWhen] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/scheduled-messages");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems((await res.json()).items ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 5000);
    return () => clearInterval(id);
  }, [load]);

  async function act(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/scheduled-messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      window.alert(typeof err.error === "string" ? err.error : "Gagal memproses");
    }
    setEditing(null);
    await load();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="queue" />
      <div className="flex-1 overflow-y-auto px-3 pb-6 md:p-6">
        <h1 className="mt-3 mb-1 text-lg font-bold md:mt-0">Antrean Kirim</h1>
        <p className="mb-4 max-w-3xl text-sm text-slate-500">
          Pesan yang ditahan otomatis karena terlalu dekat dengan pesan serupa / terlalu banyak dalam waktu singkat (risiko dianggap spam
          bot oleh WhatsApp). Dikirim satu per satu oleh sistem pada jam yang tertera. Kamu tetap bisa mengirim sekarang atau membatalkan.
        </p>

        {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Gagal memuat antrean: {error}</div>}
        {items === null && !error && <div className="text-sm text-slate-400">Memuat…</div>}
        {items && items.length === 0 && <div className="text-sm text-slate-400">Antrean kosong.</div>}

        <div className="flex max-w-3xl flex-col gap-2">
          {items?.map((it) => (
            <div key={it.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0 text-sm font-semibold">
                  {it.leadId ? (
                    <a className="hover:underline" href={`/chat?leadId=${it.leadId}`}>
                      {it.leadName ?? it.phone}
                    </a>
                  ) : (
                    it.phone
                  )}
                  <span className="ml-2 text-xs font-normal text-slate-400">{it.phone}</span>
                </div>
                <div className={`text-xs font-semibold ${it.status === "failed" ? "text-red-600" : "text-amber-700"}`}>
                  {it.status === "failed" ? "Gagal" : it.status === "sending" ? "Mengirim…" : `Kirim ${fmt(it.scheduledFor)}`}
                </div>
              </div>
              <div className="mt-2 line-clamp-4 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2 text-sm text-slate-700">{it.body}</div>
              {it.reason && <div className="mt-1 text-xs text-slate-500">Alasan ditahan: {it.reason}</div>}
              {it.lastError && <div className="mt-1 text-xs text-red-600">Error: {it.lastError}</div>}

              {it.status !== "sending" && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  <button className="font-semibold text-cyan-700 underline" onClick={() => act(it.id, { action: "send_now" })}>
                    Kirim sekarang
                  </button>
                  {it.status === "failed" && (
                    <button className="font-semibold text-cyan-700 underline" onClick={() => act(it.id, { action: "retry" })}>
                      Coba lagi
                    </button>
                  )}
                  <button
                    className="font-semibold text-slate-600 underline"
                    onClick={() => {
                      setEditing(editing === it.id ? null : it.id);
                      setWhen(toLocalInput(it.scheduledFor));
                    }}
                  >
                    Ubah jam
                  </button>
                  <button className="font-semibold text-red-600 underline" onClick={() => act(it.id, { action: "cancel" })}>
                    Batalkan
                  </button>
                </div>
              )}
              {editing === it.id && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="datetime-local"
                    step={1}
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-cyan-500"
                  />
                  <button
                    className="rounded-md bg-cyan-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
                    disabled={!when}
                    onClick={() => act(it.id, { action: "reschedule", scheduledFor: new Date(when).toISOString() })}
                  >
                    Simpan
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
