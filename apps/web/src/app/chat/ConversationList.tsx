"use client";

import { useState } from "react";
import type { ConversationListItem, Selected } from "./types";
import { CATEGORY_COLORS, categoryLabels, type LeadCategory } from "@/lib/leadSegmentation";
import { useLanguage } from "@/lib/i18n/context";
import { formatDate, formatTime, type Locale } from "@/lib/i18n/locale";

function timeLabel(iso: string, locale: Locale) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? formatTime(d, locale, { hour: "2-digit", minute: "2-digit" })
    : formatDate(d, locale, { day: "2-digit", month: "short" });
}

type TagFilter = "all" | LeadCategory;

// Every category the inbox can actually show (a wa_contact here is always
// "touched" by definition — see /api/conversations' doc comment — so
// "untouched" never applies and is left out of this list).
function tagFilters(locale: Locale, allLabel: string): { key: TagFilter; label: string }[] {
  const labels = categoryLabels(locale);
  return [
    { key: "all", label: allLabel },
    { key: "needs_reply", label: labels.needs_reply },
    { key: "replied_by_bot", label: labels.replied_by_bot },
    { key: "no_wa_account", label: labels.no_wa_account },
    { key: "non_responsive", label: labels.non_responsive },
    { key: "no_reply_after_pitch", label: labels.no_reply_after_pitch },
    { key: "needs_follow_up", label: labels.needs_follow_up },
    { key: "needs_other_contact", label: labels.needs_other_contact },
    { key: "declined", label: labels.declined },
    { key: "appointment", label: labels.appointment },
    { key: "active", label: labels.active },
  ];
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
  const [tagFilter, setTagFilter] = useState<TagFilter>("all");
  const { locale, t } = useLanguage();
  const labels = categoryLabels(locale);
  const TAG_FILTERS = tagFilters(locale, t.convAll);

  // Name/phone/message-body matching already happened server-side (see
  // /api/conversations' `?q=` handling) — `conversations` here is already
  // the search result set. Only the category chip filter is client-side.
  //
  // needs_other_contact and needs_follow_up are the two categories that
  // sit *after* needs_reply/replied_by_bot in classifyLead's priority
  // order (see leadSegmentation.ts's CATEGORY_ORDER) — so a lead tagged
  // Further Contact or Follow Up while it also has an unanswered message
  // gets tagCategory "needs_reply", not the tag you just set. Matching
  // those two filters against the raw boolean instead of tagCategory is
  // what makes a freshly-tagged lead actually show up under its own
  // filter chip; every other chip is a real mutually-exclusive state
  // (no_wa_account/appointment/declined outrank needs_reply already) so
  // tagCategory alone is correct for them.
  const filtered = conversations.filter((c) => {
    if (tagFilter === "all") return true;
    if (tagFilter === "needs_other_contact") return c.needsOtherContact;
    if (tagFilter === "needs_follow_up") return c.needsFollowUp;
    return c.tagCategory === tagFilter;
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
              {needsReplyCount} {t.convUnrepliedSuffix}
            </span>
          )}
        </div>
        <input
          type="text"
          placeholder={t.convSearchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        />
        <div className="flex flex-wrap gap-1.5">
          {TAG_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setTagFilter(f.key)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                tagFilter === f.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="p-4 text-sm text-slate-400">{t.convLoading}</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-4 text-sm text-slate-400">
            {search.trim() ? t.convNoMatch(search.trim()) : t.convNoConversations}
          </div>
        )}
        {filtered.map((c) => {
          const isSelected =
            (selected?.kind === "conversation" && selected.conversationId === c.id) ||
            (selected?.kind === "lead" && selected.leadId === c.lead?.id);
          const title = c.lead?.name ?? c.displayName ?? c.phoneNormalized ?? t.convUnknown;
          const needsReply = c.needsReply;
          const preview = c.lastMessage
            ? `${c.lastMessage.direction === "outbound" ? t.convYouPrefix : ""}${c.lastMessage.body ?? t.convMedia}`
            : t.convNoMessagesYet;
          const categoryColor = c.tagCategory ? CATEGORY_COLORS[c.tagCategory] : "#94a3b8";
          const categoryLabel = c.tagCategory ? labels[c.tagCategory] : null;

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
                      title={t.convNeedsReplyTitle}
                      className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                    />
                  )}
                  <span className="truncate text-sm font-semibold text-slate-900">{title}</span>
                </div>
                {c.lastMessage && (
                  <span className="shrink-0 text-[11px] text-slate-400">{timeLabel(c.lastMessage.sentAt, locale)}</span>
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
                    {t.convUnrepliedBadge}
                  </span>
                )}
                {c.repliedByBot && (
                  <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
                    {t.convRepliedByBotBadge}
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
                {/* Same masking as the filter above: show these two even when
                    tagCategory picked needs_reply/replied_by_bot instead, so a
                    manual tag never becomes invisible just because the lead
                    also has an unanswered message right now. */}
                {c.needsOtherContact && c.tagCategory !== "needs_other_contact" && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: `${CATEGORY_COLORS.needs_other_contact}1a`, color: CATEGORY_COLORS.needs_other_contact }}
                  >
                    {labels.needs_other_contact}
                  </span>
                )}
                {c.needsFollowUp && c.tagCategory !== "needs_follow_up" && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: `${CATEGORY_COLORS.needs_follow_up}1a`, color: CATEGORY_COLORS.needs_follow_up }}
                  >
                    {labels.needs_follow_up}
                  </span>
                )}
                <span className="truncate text-xs text-slate-500">{preview}</span>
              </div>
              {!c.lead && (
                <span className="text-[11px] text-amber-600">{t.convNotLinked}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
