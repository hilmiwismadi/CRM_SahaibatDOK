"use client";

import { useState } from "react";
import type { ConversationListItem, Selected } from "./types";
import { CATEGORY_COLORS, CATEGORY_LABELS, type LeadCategory } from "@/lib/leadSegmentation";

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

type TagFilter = "all" | LeadCategory;

// Every category the inbox can actually show (a wa_contact here is always
// "touched" by definition — see /api/conversations' doc comment — so
// "untouched" never applies and is left out of this list).
const TAG_FILTERS: { key: TagFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "needs_reply", label: CATEGORY_LABELS.needs_reply },
  { key: "replied_by_bot", label: CATEGORY_LABELS.replied_by_bot },
  { key: "no_wa_account", label: CATEGORY_LABELS.no_wa_account },
  { key: "non_responsive", label: CATEGORY_LABELS.non_responsive },
  { key: "no_reply_after_pitch", label: CATEGORY_LABELS.no_reply_after_pitch },
  { key: "needs_follow_up", label: CATEGORY_LABELS.needs_follow_up },
  { key: "needs_other_contact", label: CATEGORY_LABELS.needs_other_contact },
  { key: "declined", label: CATEGORY_LABELS.declined },
  { key: "appointment", label: CATEGORY_LABELS.appointment },
  { key: "active", label: CATEGORY_LABELS.active },
];

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
  const [tagFilter, setTagFilter] = useState<TagFilter>("all");

  // Name/phone/message-body matching already happened server-side (see
  // /api/conversations' `?q=` handling) — `conversations` here is already
  // the search result set. Only the category chip filter is client-side.
  const filtered = conversations.filter((c) => tagFilter === "all" || c.tagCategory === tagFilter);

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
          placeholder="Cari nama, nomor, atau isi chat…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        />
        <div className="flex flex-wrap gap-1.5">
          {TAG_FILTERS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTagFilter(t.key)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                tagFilter === t.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="p-4 text-sm text-slate-400">Loading conversations…</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-4 text-sm text-slate-400">
            {search.trim() ? `Tidak ada yang cocok dengan "${search.trim()}".` : "No conversations match."}
          </div>
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
          const categoryColor = c.tagCategory ? CATEGORY_COLORS[c.tagCategory] : "#94a3b8";
          const categoryLabel = c.tagCategory ? CATEGORY_LABELS[c.tagCategory] : null;

          return (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(e, c);
              }}
              className={`flex w-full flex-col gap-1 border-b border-slate-50 px-4 py-3 text-left transition-colors ${
                isSelected ? "bg-cyan-50" : needsReply ? "bg-red-50/60 hover:bg-red-50" : "bg-white hover:bg-slate-50"
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
                  <span className="truncate text-sm font-semibold text-slate-900">{title}</span>
                </div>
                {c.lastMessage && (
                  <span className="shrink-0 text-[11px] text-slate-400">{timeLabel(c.lastMessage.sentAt)}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Single canonical badge — same category /reports and /reports/kanban
                    show for this lead, instead of stacking every boolean flag that
                    happens to be true. `needsReply`/`repliedByBot` still get their own
                    pill even though a category badge is also showing: those two answer
                    "do I owe a reply right now", which is orthogonal to which bucket
                    the lead is classified into (e.g. an Appointment lead can still be
                    sitting on an unanswered message). */}
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
                {categoryLabel && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: `${categoryColor}1a`, color: categoryColor }}
                  >
                    {categoryLabel}
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
