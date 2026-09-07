"use client";

import { useEffect, useRef } from "react";
import type { WaMessageItem } from "./types";

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
}: {
  messages: WaMessageItem[];
  loading: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const items = messages.map((m, i) => ({
    message: m,
    label: dateLabel(m.sentAt),
    showDate: i === 0 || dateLabel(m.sentAt) !== dateLabel(messages[i - 1].sentAt),
  }));

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
      {loading && <div className="text-sm text-slate-400">Loading messages…</div>}
      {!loading && messages.length === 0 && (
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
                  className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
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
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
