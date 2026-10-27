"use client";

import { useRef, useState } from "react";
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
    { key: "letter_sent", label: labels.letter_sent },
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
  /** Opens the tag menu — right-click on desktop; long-press or the "⋯" button on touch. */
  onContextMenu: (pos: { x: number; y: number }, item: ConversationListItem) => void;
}) {
  const [tagFilter, setTagFilter] = useState<TagFilter>("all");
  const { locale, t } = useLanguage();
  const labels = categoryLabels(locale);
  const TAG_FILTERS = tagFilters(locale, t.convAll);

  // Touch has no right-click (iOS never fires `contextmenu`), so a 500ms
  // long-press on a row opens the same tag menu. The click that follows the
  // press is swallowed so it doesn't also open the thread.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const longPressed = useRef(false);
  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }
  function startPress(e: React.TouchEvent, item: ConversationListItem) {
    longPressed.current = false;
    cancelPress();
    const touch = e.touches[0];
    if (!touch) return;
    const pos = { x: touch.clientX, y: touch.clientY };
    pressStart.current = pos;
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null;
      longPressed.current = true;
      navigator.vibrate?.(10);
      onContextMenu(pos, item);
    }, 500);
  }
  function movePress(e: React.TouchEvent) {
    const touch = e.touches[0];
    const start = pressStart.current;
    if (!touch || !start) return;
    if (Math.abs(touch.clientX - start.x) > 10 || Math.abs(touch.clientY - start.y) > 10) cancelPress();
  }
  function endPress(e: React.TouchEvent) {
    cancelPress();
    pressStart.current = null;
    // Suppresses the synthetic click (which would also hit the window
    // "click" listener that closes the menu we just opened).
    if (longPressed.current && e.cancelable) e.preventDefault();
  }

  // Name/phone/message-body matching already happened server-side (see
  // /api/conversations' `?q=` handling) — `conversations` here is already
  // the search result set. Only the category chip filter is client-side.
  //
  // needs_other_contact, needs_follow_up, and letter_sent all sit *after*
  // higher-priority categories in classifyLead's priority order (see
  // leadSegmentation.ts's CATEGORY_ORDER) — so a lead tagged Further
  // Contact, Follow Up, or Letter Sent while it also has an unanswered
  // message (or any other higher-priority tag) gets a different
  // tagCategory, not the tag you just set. Matching those filters against
  // the raw boolean instead of tagCategory is what makes a freshly-tagged
  // lead actually show up under its own filter chip; every other chip is a
  // real mutually-exclusive state (no_wa_account/appointment/declined
  // outrank needs_reply already) so tagCategory alone is correct for them.
  const filtered = conversations.filter((c) => {
    if (tagFilter === "all") return true;
    if (tagFilter === "needs_other_contact") return c.needsOtherContact;
    if (tagFilter === "needs_follow_up") return c.needsFollowUp;
    if (tagFilter === "letter_sent") return c.letterSent;
    return c.tagCategory === tagFilter;
  });

  // "needsReply" is computed server-side (GET /api/conversations) — a
  // room's most recent message is inbound, unless a manual "mark as
  // replied" override (right-click a room) is newer than that message.
  const needsReplyCount = conversations.filter((c) => c.needsReply).length;

  return (
    <div className="flex h-full min-w-0 max-w-full flex-col overflow-hidden">
      <div className="border-b border-slate-100 p-4 max-md:px-4 max-md:pb-3 max-md:pt-3">
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
        {/* Phones: one horizontally-scrolling row instead of ~4 wrapped
            rows of chips eating the list's height. */}
        <div className="flex flex-wrap gap-1.5 max-md:-mx-4 max-md:flex-nowrap max-md:overflow-x-auto max-md:px-4 max-md:pb-1 max-md:[scrollbar-width:none]">
          {TAG_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setTagFilter(f.key)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors max-md:shrink-0 max-md:whitespace-nowrap max-md:px-3 max-md:py-2 max-md:text-xs ${
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

      <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
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
            <div key={c.id} className="relative min-w-0 max-w-full overflow-hidden">
            <button
              onClick={() => {
                if (longPressed.current) {
                  longPressed.current = false;
                  return;
                }
                onSelect(c);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                // Android fires contextmenu on long-press too — don't open twice.
                const touching = pressStart.current !== null;
                cancelPress();
                if (longPressed.current) return;
                if (touching) longPressed.current = true;
                onContextMenu({ x: e.clientX, y: e.clientY }, c);
              }}
              onTouchStart={(e) => startPress(e, c)}
              onTouchMove={movePress}
              onTouchEnd={endPress}
              onTouchCancel={endPress}
              className={`flex w-full min-w-0 max-w-full flex-col gap-1 overflow-hidden border-b border-slate-50 px-4 py-3 text-left transition-colors max-md:select-none max-md:pr-12 max-md:[-webkit-touch-callout:none] ${
                isSelected ? "bg-cyan-50" : needsReply ? "bg-red-50/60 hover:bg-red-50" : "bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
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
              {/* Preview gets its own full-width line (single line, ellipsis) so
                  it can never be covered by — or overflow next to — the tag
                  pills. Tags sit on the line below and wrap if there are many.
                  Newlines in the message are collapsed by `truncate`. */}
              <span className="block w-full min-w-0 max-w-full truncate text-xs text-slate-500">{preview}</span>
              {/* Single canonical badge — same category /reports and /reports/kanban
                  show for this lead. The old extra "Belum dibalas" pill duplicated the
                  "Belum Dijawab" category and is gone: an unanswered message is still
                  signalled by the red dot, the red row tint and the header counter. */}
              {(c.repliedByBot ||
                categoryLabel ||
                (c.needsOtherContact && c.tagCategory !== "needs_other_contact") ||
                (c.needsFollowUp && c.tagCategory !== "needs_follow_up") ||
                (c.letterSent && c.tagCategory !== "letter_sent")) && (
                <div className="flex min-w-0 max-w-full flex-wrap gap-1">
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
                  {/* Show these even when tagCategory picked a higher-priority
                      category, so a manual tag never becomes invisible. */}
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
                  {c.letterSent && c.tagCategory !== "letter_sent" && (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: `${CATEGORY_COLORS.letter_sent}1a`, color: CATEGORY_COLORS.letter_sent }}
                    >
                      {labels.letter_sent}
                    </span>
                  )}
                </div>
              )}
              {!c.lead && (
                <span className="text-[11px] text-amber-600">{t.convNotLinked}</span>
              )}
            </button>
            {/* Visible, discoverable alternative to long-press on phones. */}
            <button
              type="button"
              aria-label="Tag / tandai"
              onClick={(e) => {
                // Keep this click from reaching the window listener that
                // closes the menu.
                e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                onContextMenu({ x: r.left, y: r.bottom }, c);
              }}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 active:bg-slate-200/60 md:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
