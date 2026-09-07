"use client";

import type { ConversationListItem, Selected } from "./types";

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export default function ConversationList({
  conversations,
  loading,
  search,
  onSearchChange,
  selected,
  onSelect,
  onContextMenu,
}: {
  conversations: ConversationListItem[];
  loading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  selected: Selected | null;
  onSelect: (item: ConversationListItem) => void;
  onContextMenu: (e: React.MouseEvent, item: ConversationListItem) => void;
}) {
  const q = search.trim().toLowerCase();
  const filtered = conversations.filter((c) => {
    if (!q) return true;
    return (
      (c.lead?.name ?? "").toLowerCase().includes(q) ||
      (c.displayName ?? "").toLowerCase().includes(q) ||
      (c.phoneNormalized ?? "").toLowerCase().includes(q)
    );
  });

  // "needsReply" is computed server-side (GET /api/conversations) — a
  // room's most recent message is inbound, unless a manual "mark as
  // replied" override (right-click a room) is newer than that message.
  const needsReplyCount = conversations.filter((c) => c.needsReply).length;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 p-4">
        <div className="mb-3 flex items-center gap-2">
          <h1 className="text-lg font-bold text-slate-900">Chat</h1>
          {needsReplyCount > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
              {needsReplyCount} belum dibalas
            </span>
          )}
        </div>
        <input
          type="text"
          placeholder="Search conversations"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="p-4 text-sm text-slate-400">Loading conversations…</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-4 text-sm text-slate-400">No conversations yet.</div>
        )}
        {filtered.map((c) => {
          const isSelected =
            (selected?.kind === "conversation" && selected.conversationId === c.id) ||
            (selected?.kind === "lead" && selected.leadId === c.lead?.id);
          const title = c.lead?.name ?? c.displayName ?? c.phoneNormalized ?? "Unknown";
          const needsReply = c.needsReply;
          const preview = c.lastMessage
            ? `${c.lastMessage.direction === "outbound" ? "You: " : ""}${c.lastMessage.body ?? "[media]"}`
            : "No messages yet";

          return (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(e, c);
              }}
              className={`flex w-full flex-col gap-1 border-b border-slate-50 px-4 py-3 text-left transition-colors ${
                isSelected
                  ? "bg-cyan-50"
                  : needsReply
                    ? "bg-red-50/60 hover:bg-red-50"
                    : c.repliedByBot
                      ? "bg-violet-50/60 hover:bg-violet-50"
                      : c.needsOtherContact
                        ? "bg-amber-50/60 hover:bg-amber-50"
                        : "bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  {needsReply && (
                    <span
                      title="Belum dibalas — lead sudah reply"
                      className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                    />
                  )}
                  {c.repliedByBot && (
                    <span title="Dibalas oleh bot" className="h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                  )}
                  {c.needsOtherContact && (
                    <span title="Perlu kontak email/lainnya" className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                  )}
                  <span className="truncate text-sm font-semibold text-slate-900">{title}</span>
                </div>
                {c.lastMessage && (
                  <span className="shrink-0 text-[11px] text-slate-400">{timeLabel(c.lastMessage.sentAt)}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {c.lead?.pipelineStageDef && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: c.lead.pipelineStageDef.color }}
                  >
                    {c.lead.pipelineStageDef.label}
                  </span>
                )}
                {needsReply && (
                  <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                    Belum dibalas
                  </span>
                )}
                {c.repliedByBot && (
                  <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
                    🤖 Dibalas bot
                  </span>
                )}
                {c.needsOtherContact && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    📧 Perlu kontak lain
                  </span>
                )}
                <span className="truncate text-xs text-slate-500">{preview}</span>
              </div>
              {!c.lead && (
                <span className="text-[11px] text-amber-600">Not linked to a lead</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
