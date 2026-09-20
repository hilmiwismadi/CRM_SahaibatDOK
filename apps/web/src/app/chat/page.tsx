"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppSidebar from "@/app/components/AppSidebar";
import ContactChainTree, { type ContactChainNodeItem, type AddContactInput } from "@/app/components/ContactChainTree";
import ConversationList from "./ConversationList";
import MessageThread from "./MessageThread";
import Composer from "./Composer";
import WaStatusBadge from "./WaStatusBadge";
import UnlinkedContactsButton from "./UnlinkedContacts";
import type { ConversationListItem, LeadBrief, Selected, WaMessageItem } from "./types";
import { CATEGORY_COLORS, categoryLabels, REPLY_BRANCH_GROUPS, replyBranchLabel } from "@/lib/leadSegmentation";
import { useLanguage } from "@/lib/i18n/context";

const POLL_MS = 4000;

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
    if (leadId) setSelected({ kind: "lead", leadId });
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
  const [conversationPhone, setConversationPhone] = useState<string | null>(null);

  const [leadDetail, setLeadDetail] = useState<LeadBrief | null>(null);
  const [contacts, setContacts] = useState<ContactChainNodeItem[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: ConversationListItem } | null>(null);
  // Which Reply/Tidak-Reply branch is expanded in the context menu — reset
  // to collapsed every time a fresh menu opens (see onContextMenu below).
  const [expandedBranch, setExpandedBranch] = useState<"no_reply" | "reply" | null>(null);

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

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

  async function applyFlag(item: ConversationListItem, body: Record<string, boolean>, successMsg: string) {
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

  function handleToggleFollowUp(item: ConversationListItem, needsFollowUp: boolean) {
    return applyFlag(
      item,
      { needsFollowUp },
      needsFollowUp ? t.chatTagApplied(labels.needs_follow_up) : t.chatTagRemoved(labels.needs_follow_up),
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
  // up. "Needs reply" = the room's most recent message is inbound.
  useEffect(() => {
    const needsReply = conversations.filter((c) => c.lastMessage?.direction === "inbound").length;
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
      setConversationPhone(data.contact?.phoneNormalized ?? null);
    } catch (err) {
      if (requestId === messagesRequestId.current) {
        console.error(err);
        setMessages([]);
        setConversationPhone(null);
      }
    } finally {
      if (requestId === messagesRequestId.current) setMessagesLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

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
    setSelected(item.lead ? { kind: "lead", leadId: item.lead.id } : { kind: "conversation", conversationId: item.id });
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
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5">
          <h1 className="text-sm font-bold text-slate-900">Chat</h1>
          <div className="flex items-center gap-2">
            <UnlinkedContactsButton
              onPromoted={(leadId) => {
                setSelected({ kind: "lead", leadId });
                loadConversations();
              }}
            />
            <WaStatusBadge />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[340px] shrink-0 border-r border-slate-100 bg-white">
            <ConversationList
              conversations={conversations}
              loading={convLoading}
              search={search}
              onSearchChange={setSearch}
              onContextMenu={(e, item) => {
                setExpandedBranch(null);
                setContextMenu({ x: e.clientX, y: e.clientY, item });
              }}
              selected={selected}
              onSelect={handleSelect}
            />
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            {!selected && (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                {t.chatSelectPrompt}
              </div>
            )}

            {selected && (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{title}</div>
                    {displayPhone && <div className="text-xs text-slate-400">{displayPhone}</div>}
                  </div>
                  {selected.kind === "lead" && (
                    <button
                      onClick={() => setInfoOpen((v) => !v)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      {infoOpen ? t.chatHideInfo : t.chatLeadInfo}
                    </button>
                  )}
                </div>

                <MessageThread messages={messages} loading={messagesLoading} />

                <Composer
                  disabled={!canSend}
                  disabledReason={!canSend ? t.chatNoPhoneYet : undefined}
                  contactName={title !== "…" ? title : null}
                  onSend={handleSend}
                />

                {selected.kind === "lead" && infoOpen && (
                  <div className="max-h-64 overflow-y-auto border-t border-slate-100 bg-white p-4">
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

      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, zIndex: 100 }}
          className="min-w-[230px] max-h-[80vh] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="truncate px-3 py-1.5 text-xs font-medium text-slate-400">
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
                          <span>{labels.needs_follow_up}</span>
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
        <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
