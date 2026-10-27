"use client";

import { useEffect, useRef } from "react";
import type { ScheduledItem, WaMessageItem } from "./types";

function dateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

export default function MessageThread({
  messages,
  loading,
  scheduled = [],
  onScheduledAction,
}: {
  messages: WaMessageItem[];
  loading: boolean;
  /** Messages the send guard is holding back; rendered after the sent ones. */
  scheduled?: ScheduledItem[];
  onScheduledAction?: (id: string, action: "cancel" | "send_now") => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll only the thread's own container. scrollIntoView() also scrolls
  // every scrollable ancestor (including overflow-hidden page roots), which
  // on phones makes the whole layout jump — especially with the keyboard up.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, scheduled.length]);

  const items = messages.map((m, i) => ({
    message: m,
    label: dateLabel(m.sentAt),
    showDate: i === 0 || dateLabel(m.sentAt) !== dateLabel(messages[i - 1].sentAt),
  }));

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50 p-4 max-md:overscroll-contain max-md:px-3">
      {loading && <div className="text-sm text-slate-400">Loading messages…</div>}
      {!loading && messages.length === 0 && scheduled.length === 0 && (
        <div className="text-sm text-slate-400">No messages yet — send the first one below.</div>
      )}

      <div className="flex flex-col gap-2">
        {items.map(({ message: m, label, showDate }) => {
          const isOutgoing = m.direction === "outbound";

          return (
            <div key={m.id}>
              {showDate && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-400 shadow-sm">
                    {label}
                  </span>
                </div>
              )}
              <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] rounded-2xl max-md:max-w-[85%] px-3 py-2 text-sm shadow-sm ${
                    isOutgoing ? "bg-cyan-600 text-white" : "bg-white text-slate-800"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.body ?? "[unsupported message type]"}</div>
                  <div className={`mt-1 text-right text-[10px] ${isOutgoing ? "text-cyan-100" : "text-slate-400"}`}>
                    {new Date(m.sentAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {scheduled.map((s) => (
          <div key={s.id} className="flex justify-end">
            <div className="max-w-[70%] rounded-2xl border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-sm text-slate-800 max-md:max-w-[85%]">
              <div className="whitespace-pre-wrap break-words">{s.body}</div>
              <div className="mt-1 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[11px] text-amber-800">
                <span>
                  {s.status === "failed"
                    ? `Gagal: ${s.lastError ?? "tidak diketahui"}`
                    : s.status === "sending"
                      ? "Sedang dikirim…"
                      : `Terjadwal ${new Date(s.scheduledFor).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                </span>
                {s.reason && s.status === "queued" && <span className="text-amber-700/80">({s.reason})</span>}
                {onScheduledAction && s.status !== "sending" && (
                  <>
                    <button className="font-semibold underline" onClick={() => onScheduledAction(s.id, "send_now")}>
                      Kirim sekarang
                    </button>
                    <button className="font-semibold underline" onClick={() => onScheduledAction(s.id, "cancel")}>
                      Batalkan
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
