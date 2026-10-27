"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import AppSidebar from "@/app/components/AppSidebar";
import ContactChainTree, { type ContactChainNodeItem, type AddContactInput } from "@/app/components/ContactChainTree";
import ConversationList from "./ConversationList";
import MessageThread from "./MessageThread";
import Composer from "./Composer";
import WaStatusBadge from "./WaStatusBadge";
import UnlinkedContactsButton from "./UnlinkedContacts";
import type { ConversationListItem, LeadBrief, ScheduledItem, Selected, WaMessageItem } from "./types";
import { CATEGORY_COLORS, categoryLabels, REPLY_BRANCH_GROUPS, replyBranchLabel } from "@/lib/leadSegmentation";
import { useLanguage } from "@/lib/i18n/context";
import { formatDate } from "@/lib/i18n/locale";
import { useIsMobile } from "@/lib/useIsMobile";

const POLL_MS = 4000;

// Tomorrow, as "YYYY-MM-DD" — the default prefill for the follow-up date
// prompt. Not today: if you're setting the tag right now, "follow up
// today" isn't really a reminder for later, it's just doing it now.
function defaultFollowUpDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Stored Google Maps URL when the lead has one; otherwise a name search
// (pinned to the place id when it's a real one — hand-added leads carry
// "manual-<uuid>"), same URL shape /map's drawer uses.
function gmapsUrl(lead: LeadBrief): string {
  if (lead.googleMapsUrl) return lead.googleMapsUrl;
  const base = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.name)}`;
  return lead.googlePlaceId && !lead.googlePlaceId.startsWith("manual-")
    ? `${base}&query_place_id=${lead.googlePlaceId}`
    : base;
}

// "popover" = the desktop hover card; "sheet" = the same rows laid out
// full-width inside the phone bottom sheet (no hover on touch screens).
function LeadInfoCard({ lead, variant = "popover" }: { lead: LeadBrief; variant?: "popover" | "sheet" }) {
  const rating = lead.rating != null ? Number(lead.rating) : null;
  const rows: { label: string; value: ReactNode }[] = [];
  if (rating != null && !Number.isNaN(rating)) {
    rows.push({
      label: "Rating",
      value: `★ ${rating.toFixed(1)}${lead.reviewCount != null ? ` (${lead.reviewCount} ulasan)` : ""}`,
    });
  }
  if (lead.category) rows.push({ label: "Kategori", value: lead.category });
  if (lead.businessType) rows.push({ label: "Tipe", value: lead.businessType });
  if (lead.priceRange) rows.push({ label: "Harga", value: lead.priceRange });
  if (lead.address) rows.push({ label: "Alamat", value: lead.address });
  if (lead.province) rows.push({ label: "Provinsi", value: lead.province });
  if (lead.phoneOffice) rows.push({ label: "Telp kantor", value: lead.phoneOffice });
  if (lead.email) rows.push({ label: "Email", value: lead.email });
  const link = (href: string, text: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-sky-600 hover:underline">
      {text}
    </a>
  );
  rows.push({ label: "Google Maps", value: link(gmapsUrl(lead), "Buka di Google Maps ↗") });
  if (lead.website) rows.push({ label: "Website", value: link(lead.website, lead.website) });
  if (lead.instagramUrl) rows.push({ label: "Instagram", value: link(lead.instagramUrl, lead.instagramUrl) });
  if (lead.notes) rows.push({ label: "Catatan", value: <span className="whitespace-pre-wrap">{lead.notes}</span> });

  return (
    <div
      className={
        variant === "sheet"
          ? "w-full text-left"
          : "max-h-[70vh] w-80 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 text-left shadow-lg"
      }
    >
      <div className={variant === "sheet" ? "mb-2 text-sm font-semibold text-slate-900" : "mb-2 text-xs font-semibold text-slate-900"}>
        {lead.name}
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-slate-400">Belum ada info tambahan.</div>
      ) : (
        <dl className={variant === "sheet" ? "space-y-2 text-sm" : "space-y-1.5 text-xs"}>
          {rows.map((r) => (
            <div key={r.label} className={variant === "sheet" ? "grid grid-cols-[96px_minmax(0,1fr)] gap-2" : "grid grid-cols-[84px_1fr] gap-2"}>
              <dt className="text-slate-400">{r.label}</dt>
              <dd className="text-slate-700">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export default function ChatPage() {
  const { locale, t } = useLanguage();
  const labels = categoryLabels(locale);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [search, setSearch] = useState("");
  // Debounced (250ms) so typing doesn't fire a request per keystroke — a
  // search hits the DB across full message history (see /api/conversations'
  // `?q=` handling), not just the in-memory list the plain poll below uses.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);
  // Starts null to match SSR (no `window` on the server) — reading the URL
  // synchronously in a lazy useState initializer caused a hydration
  // mismatch, since the client's first render would differ from the
  // server's. Read it in an effect instead, after hydration completes.
  const [selected, setSelected] = useState<Selected | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const leadId = params.get("leadId");
    const conversationId = params.get("conversationId");
    if (leadId) setSelected({ kind: "lead", leadId });
    else if (conversationId) setSelected({ kind: "conversation", conversationId });
    // Lets "Contact Chain" links (e.g. the dashboard's lead modal) land
    // straight on the Lead info panel already built into this page,
    // instead of navigating to the separate /leads/[id]/contacts route —
    // that page is a structurally different route, so switching between
    // "Chat" and "Contacts" via full navigation is a heavy full-page
    // transition where an in-page panel toggle is instant.
    if (params.get("openInfo")) setInfoOpen(true);
  }, []);

  const [messages, setMessages] = useState<WaMessageItem[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  // Messages the send guard is holding back for this chat, plus the banner shown right after one was queued.
  const [scheduled, setScheduled] = useState<ScheduledItem[]>([]);
  const [queueNotice, setQueueNotice] = useState<{ scheduledFor: string; reasons: string[] } | null>(null);
  const [conversationPhone, setConversationPhone] = useState<string | null>(null);

  const [leadDetail, setLeadDetail] = useState<LeadBrief | null>(null);
  const [contacts, setContacts] = useState<ContactChainNodeItem[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: ConversationListItem } | null>(null);
  // Which Reply/Tidak-Reply branch is expanded in the context menu — reset
  // to collapsed every time a fresh menu opens (see onContextMenu below).
  const [expandedBranch, setExpandedBranch] = useState<"no_reply" | "reply" | null>(null);

  // Follow-up date prompt — opened by handleToggleFollowUp instead of
  // applying the tag right away, see that function's comment.
  const [followUpPrompt, setFollowUpPrompt] = useState<ConversationListItem | null>(null);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");

  // Every tag action below closes the menu immediately and the list's
  // single canonical badge (see ConversationList) often doesn't change at
  // all — e.g. tagging "Further Contact" on a lead that's currently
  // "Belum Dijawab" (needs_reply outranks it in classifyLead's priority
  // order) leaves the row looking untouched even though the tag saved
  // correctly. Without this toast a successful click and a silently
  // failed fetch were indistinguishable — this is the fix for that.
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 3000);
  }, []);

  // Phones get master→detail navigation (list OR thread, never side by
  // side), a bottom-sheet tag menu and a bottom-sheet lead info panel.
  // Layout switching itself is pure CSS (`max-md:`), this only drives the
  // pieces whose structure/behaviour differs.
  const isMobile = useIsMobile();
  // On phones opening a thread pushes a history entry, so the hardware /
  // browser Back button returns to the list instead of leaving /chat.
  const threadPushed = useRef(false);

  function openThread(next: Selected) {
    setSelected(next);
    if (!isMobile) return;
    const qs =
      next.kind === "lead"
        ? `leadId=${encodeURIComponent(next.leadId)}`
        : `conversationId=${encodeURIComponent(next.conversationId)}`;
    const url = `${window.location.pathname}?${qs}`;
    if (threadPushed.current) {
      window.history.replaceState(null, "", url);
    } else {
      window.history.pushState(null, "", url);
      threadPushed.current = true;
    }
  }

  function closeThread() {
    setInfoOpen(false);
    setContextMenu(null);
    if (threadPushed.current) {
      // The popstate handler below clears the selection.
      window.history.back();
      return;
    }
    setSelected(null);
    window.history.replaceState(null, "", window.location.pathname);
  }

  useEffect(() => {
    if (!isMobile) return;
    const onPop = () => {
      threadPushed.current = false;
      const params = new URLSearchParams(window.location.search);
      const leadId = params.get("leadId");
      const conversationId = params.get("conversationId");
      setSelected(
        leadId ? { kind: "lead", leadId } : conversationId ? { kind: "conversation", conversationId } : null,
      );
      setInfoOpen(false);
      setContextMenu(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [isMobile]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("click", close);
    // The phone bottom sheet scrolls internally, so "close on scroll"
    // (which keeps the desktop popover from floating away) is desktop-only.
    if (!isMobile) window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu, isMobile]);

  async function applyFlag(item: ConversationListItem, body: Record<string, boolean | string | null>, successMsg: string) {
    setContextMenu(null);
    try {
      const res = await fetch(`/api/conversations/${item.id}/flag`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        showToast(t.chatTagFailed);
        return;
      }
      showToast(successMsg);
      await loadConversations();
    } catch {
      showToast(t.chatTagFailed);
    }
  }

  async function handleMarkReplied(item: ConversationListItem, replied: boolean, kind?: "manual" | "bot") {
    setContextMenu(null);
    try {
      const res = await fetch(`/api/conversations/${item.id}/replied`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replied, kind }),
      });
      if (!res.ok) {
        showToast(t.chatTagFailed);
        return;
      }
      showToast(!replied ? t.chatToastMarkedUnreplied : kind === "bot" ? t.chatToastMarkedRepliedByBot : t.chatToastMarkedReplied);
      await loadConversations();
    } catch {
      showToast(t.chatTagFailed);
    }
  }

  function handleToggleOtherContact(item: ConversationListItem, needsOtherContact: boolean) {
    return applyFlag(
      item,
      { needsOtherContact },
      needsOtherContact ? t.chatTagApplied(labels.needs_other_contact) : t.chatTagRemoved(labels.needs_other_contact),
    );
  }

  // Turning Follow Up ON opens a date prompt instead of applying right
  // away — "when should I be reminded to follow up" is the whole point of
  // this tag, so it's asked up front rather than left for the sidebar
  // reminder popup to come up empty. Turning it OFF applies immediately
  // (the flag route clears followUpAt server-side either way).
  function handleToggleFollowUp(item: ConversationListItem, needsFollowUp: boolean) {
    if (needsFollowUp) {
      setContextMenu(null);
      setFollowUpPrompt(item);
      if (item.followUpAt && item.followUpHasTime) {
        // Timed follow-up: show the local date/time it was set for, not the UTC slice.
        const d = new Date(item.followUpAt);
        const pad = (n: number) => String(n).padStart(2, "0");
        setFollowUpDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
        setFollowUpTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
      } else {
        setFollowUpDate(item.followUpAt ? item.followUpAt.slice(0, 10) : defaultFollowUpDate());
        setFollowUpTime("");
      }
      setFollowUpNote(item.followUpNote ?? "");
      return Promise.resolve();
    }
    return applyFlag(item, { needsFollowUp: false }, t.chatTagRemoved(labels.needs_follow_up));
  }

  function handleConfirmFollowUp() {
    if (!followUpPrompt || !followUpDate) return;
    const item = followUpPrompt;
    setFollowUpPrompt(null);
    return applyFlag(
      item,
      {
        needsFollowUp: true,
        // Bare date, or a full ISO datetime when a time was picked (the flag
        // route treats a "T" as "has a specific time").
        followUpAt: followUpTime ? new Date(`${followUpDate}T${followUpTime}`).toISOString() : followUpDate,
        followUpNote: followUpNote.trim(),
      },
      t.chatFollowUpScheduled(formatDate(followUpDate, locale, { day: "2-digit", month: "long", year: "numeric" })),
    );
  }

  function handleToggleNoWaAccount(item: ConversationListItem, noWaAccount: boolean) {
    return applyFlag(
      item,
      { noWaAccount },
      noWaAccount ? t.chatTagApplied(labels.no_wa_account) : t.chatTagRemoved(labels.no_wa_account),
    );
  }

  function handleToggleAppointment(item: ConversationListItem, appointment: boolean) {
    return applyFlag(
      item,
      { appointment },
      appointment ? t.chatTagApplied(labels.appointment) : t.chatTagRemoved(labels.appointment),
    );
  }

  function handleToggleDeclined(item: ConversationListItem, declined: boolean) {
    return applyFlag(item, { declined }, declined ? t.chatTagApplied(labels.declined) : t.chatTagRemoved(labels.declined));
  }

  function handleToggleLetterSent(item: ConversationListItem, letterSent: boolean) {
    return applyFlag(
      item,
      { letterSent },
      letterSent ? t.chatTagApplied(labels.letter_sent) : t.chatTagRemoved(labels.letter_sent),
    );
  }

  // Passive notification: a lead replying while you're on a different tab
  // (or a different page in the app) still shows up as a badge on the
  // browser tab title, since there's no OS-level push notification wired
  // up. "Needs reply" uses the server-computed c.needsReply — the same flag
  // ConversationList's "N belum dibalas" badge counts — so rooms marked
  // replied (manual/bot override) don't inflate the tab count.
  useEffect(() => {
    const needsReply = conversations.filter((c) => c.needsReply).length;
    document.title = needsReply > 0 ? `(${needsReply}) Chat — SahAIbat DOK` : "Chat — SahAIbat DOK";
    return () => {
      document.title = "SahAIbat DOK";
    };
  }, [conversations]);

  const loadConversations = useCallback(async () => {
    try {
      const url = debouncedSearch
        ? `/api/conversations?q=${encodeURIComponent(debouncedSearch)}`
        : "/api/conversations";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load conversations (HTTP ${res.status})`);
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setConvLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadConversations();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") loadConversations();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [loadConversations]);

  // Guards against two failure modes that both make the thread look
  // "stuck" showing a previous room's history: (1) an out-of-order
  // response — the request for a room you just switched away from
  // resolving after the request for the room you switched to; (2) a
  // failed fetch (e.g. dev-server 500) silently leaving the last
  // successfully-loaded messages on screen instead of clearing them.
  const messagesRequestId = useRef(0);

  const loadMessages = useCallback(async () => {
    if (!selected) {
      setMessages([]);
      setScheduled([]);
      setConversationPhone(null);
      return;
    }
    const requestId = ++messagesRequestId.current;
    setMessagesLoading(true);
    try {
      const url =
        selected.kind === "lead"
          ? `/api/leads/${selected.leadId}/messages`
          : `/api/conversations/${selected.conversationId}/messages`;
      const res = await fetch(url);
      if (requestId !== messagesRequestId.current) return; // superseded by a newer selection
      if (!res.ok) throw new Error(`Failed to load messages (HTTP ${res.status})`);
      const data = await res.json();
      setMessages(data.messages ?? []);
      setScheduled(data.scheduled ?? []);
      setConversationPhone(data.contact?.phoneNormalized ?? null);
    } catch (err) {
      if (requestId === messagesRequestId.current) {
        console.error(err);
        setMessages([]);
        setScheduled([]);
        setConversationPhone(null);
      }
    } finally {
      if (requestId === messagesRequestId.current) setMessagesLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // The "queued" banner belongs to the chat it was shown in.
  useEffect(() => {
    setQueueNotice(null);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") loadMessages();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [selected, loadMessages]);

  const loadLeadInfo = useCallback(async () => {
    if (selected?.kind !== "lead") {
      setLeadDetail(null);
      setContacts([]);
      setActiveContactId(null);
      return;
    }
    try {
      const [leadRes, contactsRes] = await Promise.all([
        fetch(`/api/leads/${selected.leadId}`),
        fetch(`/api/leads/${selected.leadId}/contacts`),
      ]);
      if (!leadRes.ok || !contactsRes.ok) {
        throw new Error(`Failed to load lead info (HTTP ${leadRes.status}/${contactsRes.status})`);
      }
      const leadData = await leadRes.json();
      const contactsData = await contactsRes.json();
      setLeadDetail(leadData.lead ?? null);
      setContacts(contactsData.contacts ?? []);
      setActiveContactId(contactsData.activeContactId ?? null);
    } catch (err) {
      console.error(err);
      setLeadDetail(null);
      setContacts([]);
      setActiveContactId(null);
    }
  }, [selected]);

  useEffect(() => {
    loadLeadInfo();
  }, [loadLeadInfo]);

  function handleSelect(item: ConversationListItem) {
    openThread(item.lead ? { kind: "lead", leadId: item.lead.id } : { kind: "conversation", conversationId: item.id });
  }

  async function handleSend(body: string) {
    if (!selected) return;
    const url =
      selected.kind === "lead"
        ? `/api/leads/${selected.leadId}/messages`
        : `/api/conversations/${selected.conversationId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      window.alert(typeof err.error === "string" ? err.error : "Failed to send message");
      return;
    }
    if (res.status === 202) {
      // Not sent: the send guard saw similar / too-frequent outreach and queued it for a safer time.
      const data = await res.json().catch(() => ({}));
      if (data.scheduled) setQueueNotice({ scheduledFor: data.scheduled.scheduledFor, reasons: data.scheduled.reasons ?? [] });
    } else {
      setQueueNotice(null);
    }
    await Promise.all([loadMessages(), loadConversations()]);
  }

  async function handleScheduledAction(id: string, action: "cancel" | "send_now") {
    const res = await fetch(`/api/scheduled-messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      window.alert(typeof err.error === "string" ? err.error : "Gagal memproses pesan terjadwal");
    }
    setQueueNotice(null);
    await Promise.all([loadMessages(), loadConversations()]);
  }

  async function handleActivateContact(contactId: string) {
    if (selected?.kind !== "lead") return;
    await fetch(`/api/leads/${selected.leadId}/contacts/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    await Promise.all([loadLeadInfo(), loadMessages()]);
  }

  async function handleAddContact(data: AddContactInput) {
    if (selected?.kind !== "lead") return;
    await fetch(`/api/leads/${selected.leadId}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await loadLeadInfo();
  }

  const selectedConversation =
    selected?.kind === "conversation" ? conversations.find((c) => c.id === selected.conversationId) ?? null : null;

  const activeLeadNode = contacts.find((c) => c.id === activeContactId) ?? null;
  const displayPhone = selected?.kind === "lead" ? activeLeadNode?.phoneNormalized ?? null : conversationPhone;
  const canSend = selected?.kind === "lead" ? Boolean(activeLeadNode?.phoneNormalized) : Boolean(conversationPhone);
  const title =
    selected?.kind === "lead"
      ? leadDetail?.name ?? "…"
      : selectedConversation?.displayName ?? selectedConversation?.phoneNormalized ?? "…";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa] text-slate-900">
      <AppSidebar active="chat" />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Phones: hidden while a thread is open (thread is full-screen). */}
        <div
          className={`flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 max-md:h-12 max-md:justify-end max-md:px-3 ${
            selected ? "max-md:hidden" : ""
          }`}
        >
          {/* The phone top bar already says "Chat". */}
          <h1 className="text-sm font-bold text-slate-900 max-md:hidden">Chat</h1>
          <div className="flex min-w-0 items-center gap-2">
            <UnlinkedContactsButton
              onPromoted={(leadId) => {
                openThread({ kind: "lead", leadId });
                loadConversations();
              }}
            />
            <WaStatusBadge />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Master pane: fixed 340px column on desktop, full screen on phones
              until a conversation is picked. */}
          <div
            className={`w-[340px] shrink-0 border-r border-slate-100 bg-white max-md:w-full max-md:min-w-0 max-md:max-w-full max-md:overflow-hidden max-md:border-r-0 ${
              selected ? "max-md:hidden" : ""
            }`}
          >
            <ConversationList
              conversations={conversations}
              loading={convLoading}
              search={search}
              onSearchChange={setSearch}
              onContextMenu={(pos, item) => {
                setExpandedBranch(null);
                setContextMenu({ x: pos.x, y: pos.y, item });
              }}
              selected={selected}
              onSelect={handleSelect}
            />
          </div>

          {/* Detail pane: on phones only rendered visibly once selected. */}
          <div className={`flex min-w-0 flex-1 flex-col overflow-hidden ${selected ? "" : "max-md:hidden"}`}>
            {!selected && (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                {t.chatSelectPrompt}
              </div>
            )}

            {selected && (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 max-md:gap-1 max-md:px-1 max-md:py-1.5">
                  <div className="flex min-w-0 items-center gap-3 max-md:gap-1.5">
                    <button
                      type="button"
                      onClick={closeThread}
                      aria-label="Kembali ke daftar chat"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 active:bg-slate-100 md:hidden"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 max-md:truncate">{title}</div>
                      {displayPhone && <div className="text-xs text-slate-400 max-md:truncate">{displayPhone}</div>}
                    </div>
                    {selected.kind === "lead" && leadDetail && (
                      <a
                        href={gmapsUrl(leadDetail)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open Gmaps"
                        className="whitespace-nowrap rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-700 max-md:flex max-md:h-10 max-md:shrink-0 max-md:items-center max-md:px-2.5"
                      >
                        <span className="md:hidden">Maps ↗</span>
                        <span className="max-md:hidden">Open Gmaps ↗</span>
                      </a>
                    )}
                  </div>
                  {selected.kind === "lead" && (
                    <div className="group relative max-md:shrink-0">
                      <button
                        onClick={() => setInfoOpen((v) => !v)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 max-md:h-10 max-md:whitespace-nowrap max-md:px-2.5"
                      >
                        {/* On phones the button opens a bottom sheet, which
                            has its own close control. */}
                        <span className="md:hidden">{t.chatLeadInfo}</span>
                        <span className="max-md:hidden">{infoOpen ? t.chatHideInfo : t.chatLeadInfo}</span>
                      </button>
                      {leadDetail && (
                        // pt-2 (not margin) keeps the hover area continuous
                        // between the button and the card so links stay clickable.
                        // Desktop only: touch has no hover, phones use the sheet.
                        <div className="invisible absolute right-0 top-full z-50 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 max-md:hidden">
                          <LeadInfoCard lead={leadDetail} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <MessageThread
                  messages={messages}
                  loading={messagesLoading}
                  scheduled={scheduled}
                  onScheduledAction={handleScheduledAction}
                />

                {queueNotice && (
                  <div className="shrink-0 border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                    <span className="font-semibold">
                      Pesan dijadwalkan pukul{" "}
                      {new Date(queueNotice.scheduledFor).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      , belum terkirim.
                    </span>{" "}
                    {queueNotice.reasons.length > 0 && <span>{queueNotice.reasons.join(" • ")}. </span>}
                    <span>Dijeda otomatis agar tidak terlihat seperti bot spam. </span>
                    <a href="/queue" className="underline">Lihat antrean</a>
                  </div>
                )}

                <Composer
                  disabled={!canSend}
                  disabledReason={!canSend ? t.chatNoPhoneYet : undefined}
                  contactName={title !== "…" ? title : null}
                  contactAddress={selected.kind === "lead" ? leadDetail?.address : null}
                  onSend={handleSend}
                />

                {selected.kind === "lead" && infoOpen && (
                  <div className="max-h-64 overflow-y-auto border-t border-slate-100 bg-white p-4 max-md:hidden">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t.chatContactChain}</div>
                    <ContactChainTree
                      contacts={contacts}
                      activeContactId={activeContactId}
                      onActivate={handleActivateContact}
                      onAdd={handleAddContact}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Phones: lead info + contact chain as a bottom sheet (the desktop
          hover card and the under-composer panel don't work on touch). */}
      {isMobile && selected?.kind === "lead" && infoOpen && (
        <div className="fixed inset-0 z-[100] flex items-end bg-black/40" onClick={() => setInfoOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 py-1 pl-4 pr-1">
              <span className="text-sm font-semibold text-slate-900">{t.chatLeadInfo}</span>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                aria-label={t.close}
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-400 active:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3">
              {leadDetail ? (
                <LeadInfoCard lead={leadDetail} variant="sheet" />
              ) : (
                <div className="text-sm text-slate-400">…</div>
              )}
              <div className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">{t.chatContactChain}</div>
              <ContactChainTree
                contacts={contacts}
                activeContactId={activeContactId}
                onActivate={handleActivateContact}
                onAdd={handleAddContact}
              />
            </div>
          </div>
        </div>
      )}

      {/* Phones: a dimmed backdrop behind the tag bottom sheet. A tap on it
          bubbles to the window "click" listener, which closes the menu. */}
      {contextMenu && isMobile && <div className="fixed inset-0 z-[99] bg-black/40" />}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={isMobile ? undefined : { position: "fixed", top: contextMenu.y, left: contextMenu.x, zIndex: 100 }}
          className={
            isMobile
              ? "fixed inset-x-0 bottom-0 [&_button]:min-h-[46px] z-[100] max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-2xl bg-white pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-2xl"
              : "min-w-[230px] max-h-[80vh] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          }
        >
          {isMobile && <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-slate-200" />}
          <div className="truncate px-3 py-1.5 text-xs font-medium text-slate-400 max-md:px-4 max-md:py-2 max-md:text-sm">
            {contextMenu.item.lead?.name ?? contextMenu.item.displayName ?? contextMenu.item.phoneNormalized}
          </div>
          {contextMenu.item.needsReply ? (
            <>
              <button
                onClick={() => handleMarkReplied(contextMenu.item, true, "manual")}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-emerald-500">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t.chatMarkReplied}
              </button>
              <button
                onClick={() => handleMarkReplied(contextMenu.item, true, "bot")}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-violet-500">
                  <rect x="4" y="8" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M9 13v2M15 13v2M9 4v4M15 4v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {t.chatMarkRepliedByBot}
              </button>
            </>
          ) : (
            <button
              onClick={() => handleMarkReplied(contextMenu.item, false)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-red-500">
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
              </svg>
              {t.chatMarkUnreplied}
            </button>
          )}
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={() => handleToggleNoWaAccount(contextMenu.item, !contextMenu.item.noWaAccount)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-gray-500">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
              <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {contextMenu.item.noWaAccount ? `${t.chatRemoveTagPrefix} ${labels.no_wa_account}` : labels.no_wa_account}
          </button>
          <div className="my-1 border-t border-slate-100" />
          {/* Cascading branch picker mirroring the triase diagram: pick
              "Tidak Reply" or "Reply" first, its leaf categories only then
              expand below it — see leadSegmentation.ts's REPLY_BRANCH_GROUPS. */}
          {REPLY_BRANCH_GROUPS.map((branch) => {
            const isOpen = expandedBranch === branch.key;
            return (
              <div key={branch.key}>
                <button
                  onClick={() => setExpandedBranch(isOpen ? null : branch.key)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                  >
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {replyBranchLabel(branch.key, locale)}
                </button>
                {isOpen && (
                  <div className="pb-1">
                    {branch.key === "no_reply" ? (
                      // Both leaves here are computed automatically (see
                      // nonResponsive.ts / noReplyAfterPitch.ts) — shown as
                      // read-only status, not a toggle, matching /reports/kanban
                      // treating these as non-draggable columns.
                      <>
                        <div className="flex items-center justify-between px-3 py-1.5 pl-8 text-sm text-slate-500">
                          <span>{labels.non_responsive}</span>
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{
                              backgroundColor: contextMenu.item.nonResponsive ? `${CATEGORY_COLORS.non_responsive}1a` : undefined,
                              color: contextMenu.item.nonResponsive ? CATEGORY_COLORS.non_responsive : "#cbd5e1",
                            }}
                          >
                            {contextMenu.item.nonResponsive ? t.chatYes : t.chatNotYet}
                          </span>
                        </div>
                        <div className="flex items-center justify-between px-3 py-1.5 pl-8 text-sm text-slate-500">
                          <span>{labels.no_reply_after_pitch}</span>
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{
                              backgroundColor: contextMenu.item.noReplyAfterPitch
                                ? `${CATEGORY_COLORS.no_reply_after_pitch}1a`
                                : undefined,
                              color: contextMenu.item.noReplyAfterPitch ? CATEGORY_COLORS.no_reply_after_pitch : "#cbd5e1",
                            }}
                          >
                            {contextMenu.item.noReplyAfterPitch ? t.chatYes : t.chatNotYet}
                          </span>
                        </div>
                        <div className="px-3 pl-8 text-[11px] text-slate-400">{t.chatAutoNoManual}</div>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleToggleFollowUp(contextMenu.item, !contextMenu.item.needsFollowUp)}
                          className="flex w-full items-center justify-between px-3 py-1.5 pl-8 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <span>
                            {labels.needs_follow_up}
                            {contextMenu.item.needsFollowUp && contextMenu.item.followUpAt && (
                              <span className="ml-1.5 text-[11px] text-slate-400">
                                ({formatDate(contextMenu.item.followUpAt, locale, { day: "2-digit", month: "short" })})
                              </span>
                            )}
                          </span>
                          {contextMenu.item.needsFollowUp && <span className="text-emerald-500">✓</span>}
                        </button>
                        <button
                          onClick={() => handleToggleOtherContact(contextMenu.item, !contextMenu.item.needsOtherContact)}
                          className="flex w-full items-center justify-between px-3 py-1.5 pl-8 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <span>{labels.needs_other_contact}</span>
                          {contextMenu.item.needsOtherContact && <span className="text-emerald-500">✓</span>}
                        </button>
                        <button
                          onClick={() => handleToggleDeclined(contextMenu.item, !contextMenu.item.declined)}
                          className="flex w-full items-center justify-between px-3 py-1.5 pl-8 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <span>{labels.declined}</span>
                          {contextMenu.item.declined && <span className="text-emerald-500">✓</span>}
                        </button>
                        <button
                          onClick={() => handleToggleAppointment(contextMenu.item, !contextMenu.item.appointment)}
                          className="flex w-full items-center justify-between px-3 py-1.5 pl-8 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <span>{labels.appointment}</span>
                          {contextMenu.item.appointment && <span className="text-emerald-500">✓</span>}
                        </button>
                        <button
                          onClick={() => handleToggleLetterSent(contextMenu.item, !contextMenu.item.letterSent)}
                          className="flex w-full items-center justify-between px-3 py-1.5 pl-8 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <span>{labels.letter_sent}</span>
                          {contextMenu.item.letterSent && <span className="text-emerald-500">✓</span>}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {toast && (
        // Phones: lifted above the composer and capped to the screen width.
        <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg max-md:bottom-[calc(104px+env(safe-area-inset-bottom))] max-md:z-[110] max-md:w-max max-md:max-w-[calc(100vw-32px)] max-md:text-center">
          {toast}
        </div>
      )}
      {followUpPrompt && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 max-md:z-[100] max-md:items-end max-md:p-0"
          onClick={() => setFollowUpPrompt(null)}
        >
          {/* Phones: bottom sheet, scrollable when the keyboard is up. */}
          <div
            className="w-full max-w-xs rounded-xl bg-white p-5 shadow-xl max-md:max-h-[90dvh] max-md:max-w-none max-md:overflow-y-auto max-md:rounded-b-none max-md:rounded-t-2xl max-md:pb-[calc(20px+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 text-sm font-semibold text-slate-900">{t.chatFollowUpPromptTitle}</h3>
            <p className="mb-3 truncate text-xs text-slate-400">{followUpPrompt.lead?.name ?? followUpPrompt.displayName}</p>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
            />
            <label className="mt-2 block text-xs font-medium text-slate-600">{t.chatFollowUpTimeLabel}</label>
            <input
              type="time"
              value={followUpTime}
              onChange={(e) => setFollowUpTime(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
            />
            <p className="mt-2 text-xs text-slate-400">{t.chatFollowUpPromptHint}</p>
            <label className="mt-3 block text-xs font-medium text-slate-600">{t.chatFollowUpNoteLabel}</label>
            <textarea
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder={t.chatFollowUpNotePlaceholder}
              className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-cyan-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setFollowUpPrompt(null)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 max-md:min-h-[44px] max-md:flex-1 max-md:border max-md:border-slate-200"
              >
                {t.chatFollowUpCancel}
              </button>
              <button
                onClick={handleConfirmFollowUp}
                disabled={!followUpDate}
                className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 max-md:min-h-[44px] max-md:flex-1"
              >
                {t.chatFollowUpConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
