/**
 * Single source of truth for "what state is this lead in" — used by
 * GET /api/reports/segmentation (funnel stats + Kanban columns) and
 * GET /api/leads's ?tag= filter (dashboard), so the two views can never
 * disagree about which bucket a lead falls into. See
 * Context/SahaibatExplanation/6.ReportsDashboardPlan.md and the
 * conversation that led to this file for the full reasoning.
 *
 * "Touched" vs "untouched": pipelineStage !== "new" OR the lead has any
 * wa_contacts row at all. Pipeline stage alone isn't quite enough — a send
 * that fails immediately because the number has no WhatsApp account
 * (NotOnWhatsAppError, see apps/wa-bridge's sendText()) gets auto-tagged
 * noWaAccount via waSend.ts's catch block, but never reaches the
 * new->contacted advance logic (that only runs on a successful send).
 * Verified against real data before this fix: 21 leads had a wa_contacts
 * row (someone genuinely tried to reach them) while still sitting at
 * pipelineStage "new" — they'd have been wrongly bucketed as untouched.
 * There's still no tracked signal for "a rep manually reviewed this lead
 * without ever messaging it," so that case isn't distinguished here.
 *
 * Within "touched", a lead can carry multiple tags at once (e.g. both
 * needsFollowUp and noWaAccount) but only belongs to ONE category for
 * funnel/Kanban purposes — first match in CATEGORY_ORDER wins. Order is
 * deliberately: confirmed dead-ends (no_wa_account, declined) and the one
 * positive milestone (appointment) first since they're the most
 * actionable/rare, then the "needs a reply" urgency signals, then the
 * standing-note tags, then the two "gone quiet" flavors, then "active" —
 * which is deliberately NOT a resting state. It means nothing has been
 * assessed yet, not that the lead is fine; a human still has to look and
 * either tag it into one of the categories above or leave it here on
 * purpose. See the 2026-09-12 chat-history review that renamed this from
 * "Aktif" for exactly that reason — the old name read as "healthy" when
 * most of what landed here on inspection was actually unclassified
 * declines or dead silence.
 * "no_wa_account" here means the confirmed WaContact.noWaAccount tag
 * specifically — NOT the broader "or has no phone at all" definition
 * /map's pinColor() uses. A lead with zero phone can never be "touched"
 * in the first place (touching requires having sent a message), so that
 * broader definition doesn't apply within this touched-only breakdown.
 */

export type LeadCategory =
  | "untouched"
  | "no_wa_account"
  | "appointment"
  | "declined"
  | "needs_reply"
  | "replied_by_bot"
  | "needs_other_contact"
  | "needs_follow_up"
  | "letter_sent"
  | "no_reply_after_pitch"
  | "non_responsive"
  | "active";

export const CATEGORY_ORDER: LeadCategory[] = [
  "untouched",
  "no_wa_account",
  "appointment",
  "declined",
  "needs_reply",
  "replied_by_bot",
  "needs_other_contact",
  "needs_follow_up",
  "letter_sent",
  "no_reply_after_pitch",
  "non_responsive",
  "active",
];

// One name per category, everywhere — /chat's inbox badges, its filter
// chips, its context menu, /reports' funnel, and /reports/kanban's columns
// all import these same strings. Before 2026-09-12 the "Reply" branch had
// two parallel names in play (e.g. "Butuh Follow Up" here vs "Follow Up"
// in ad-hoc report copy) which is exactly the "Menolak vs Reject, which is
// it" confusion that prompted this file's rename — see the tree diagram in
// the "Peta Triase 82 Lead" artifact, whose leaf labels are the ones kept.
export const CATEGORY_LABELS: Record<LeadCategory, string> = {
  untouched: "Belum Disentuh",
  no_wa_account: "Tidak Ada Kontak WA",
  appointment: "Appointment",
  declined: "Reject",
  needs_reply: "Belum Dijawab",
  replied_by_bot: "Dijawab Bot",
  needs_other_contact: "Further Contact",
  needs_follow_up: "Follow Up",
  letter_sent: "Letter Sent",
  no_reply_after_pitch: "Not-Interested",
  non_responsive: "Non-Responsive",
  active: "Perlu Diklasifikasi",
};

// English counterpart, same keys/order — used by every UI component
// instead of CATEGORY_LABELS when the language toggle (see
// src/lib/i18n) is set to "en". Kept next to CATEGORY_LABELS rather than
// in the i18n dictionary since both are derived from the same
// LeadCategory source of truth and must never drift apart key-for-key.
export const CATEGORY_LABELS_EN: Record<LeadCategory, string> = {
  untouched: "Untouched",
  no_wa_account: "No WhatsApp Contact",
  appointment: "Appointment",
  declined: "Reject",
  needs_reply: "Awaiting Reply",
  replied_by_bot: "Replied by Bot",
  needs_other_contact: "Further Contact",
  needs_follow_up: "Follow Up",
  letter_sent: "Letter Sent",
  no_reply_after_pitch: "Not-Interested",
  non_responsive: "Non-Responsive",
  active: "Needs Review",
};

export function categoryLabels(locale: "id" | "en"): Record<LeadCategory, string> {
  return locale === "en" ? CATEGORY_LABELS_EN : CATEGORY_LABELS;
}

/**
 * The two-level grouping the triase diagram draws — Bisa Dihubungi splits
 * into "Tidak Reply" vs "Reply", each with its own leaf categories. Drives
 * /chat's cascading context menu and any other UI that wants to render the
 * funnel as a tree instead of a flat list. `no_wa_account` sits outside
 * both branches (it's the "Tidak Bisa Dihubungi" split, one level up) and
 * `untouched`/`needs_reply`/`replied_by_bot`/`active` aren't part of the
 * Reply/Tidak-Reply split at all, so none of those appear here.
 */
export const REPLY_BRANCH_GROUPS: {
  key: "no_reply" | "reply";
  label: string;
  categories: LeadCategory[];
}[] = [
  { key: "no_reply", label: "Tidak Reply", categories: ["non_responsive", "no_reply_after_pitch"] },
  {
    key: "reply",
    label: "Reply",
    categories: ["needs_follow_up", "needs_other_contact", "declined", "appointment", "letter_sent"],
  },
];

export const REPLY_BRANCH_LABELS_EN: Record<"no_reply" | "reply", string> = {
  no_reply: "No Reply",
  reply: "Replied",
};

export function replyBranchLabel(key: "no_reply" | "reply", locale: "id" | "en"): string {
  return locale === "en" ? REPLY_BRANCH_LABELS_EN[key] : REPLY_BRANCH_GROUPS.find((b) => b.key === key)!.label;
}

export const CATEGORY_COLORS: Record<LeadCategory, string> = {
  untouched: "#94a3b8", // slate-400
  no_wa_account: "#6b7280", // gray-500
  appointment: "#10b981", // emerald-500
  declined: "#991b1b", // red-800
  needs_reply: "#ef4444", // red-500
  replied_by_bot: "#8b5cf6", // violet-500
  needs_other_contact: "#f59e0b", // amber-500
  needs_follow_up: "#0ea5e9", // sky-500
  letter_sent: "#0d9488", // teal-600
  no_reply_after_pitch: "#dc2626", // red-600 — solid fallback where a single color is needed
  non_responsive: "#a16207", // amber-700
  active: "#78716c", // stone-500 — deliberately muted/neutral, not a "healthy" color
};

// Two-stop gradient for categories that want the richer treatment (currently
// just no_reply_after_pitch, per the user's explicit "orange to red" ask) —
// CATEGORY_COLORS above stays the solid fallback for spots that only take
// one color (small dots, plain borders).
export const CATEGORY_GRADIENTS: Partial<Record<LeadCategory, [string, string]>> = {
  no_reply_after_pitch: ["#f97316", "#dc2626"],
};

export interface ContactTagInput {
  noWaAccount: boolean;
  appointment: boolean;
  // Manual flag: lead explicitly said no. Checked right after appointment
  // (same tier — a confirmed dead end) so a decline doesn't linger under
  // needsFollowUp or fall through to "Perlu Diklasifikasi" just because no
  // one clicked the right button yet.
  declined: boolean;
  needsOtherContact: boolean;
  needsFollowUp: boolean;
  // Manual flag: BD sent this lead a formal invitation letter — see
  // schema.prisma's WaContact.letterSent. Checked after needsFollowUp
  // (lower priority) since it's a standing outreach note, not a funnel
  // outcome — a lead who replied or needs review should still show that,
  // not just "we mailed them something."
  letterSent: boolean;
  repliedOverrideAt: Date | string | null;
  repliedOverrideKind: string | null;
  lastMessage: { direction: string; sentAt: Date | string } | null;
  // True when this contact matches the "sent the pitch, they'd replied
  // before it, nothing since" pattern — computed via a DB query
  // (getNoReplyAfterPitchContactIds in noReplyAfterPitch.ts) since it needs
  // full message history, not just the fields above. Checked after
  // needs_follow_up so a lead you've manually tagged Butuh Follow Up
  // keeps showing there rather than being silently reclassified.
  noReplyAfterPitch: boolean;
  // True when this contact has at least one outbound message, zero
  // inbound ever, and the first outbound was sent more than 2 days ago —
  // computed via getNonResponsiveContactIds in nonResponsive.ts. The
  // "diam dari awal" counterpart to noReplyAfterPitch's "diam setelah
  // pitch"; checked last among the "something's off" categories since
  // anything more specific above should win first.
  nonResponsive: boolean;
}

export interface ClassifyLeadInput {
  pipelineStage: string;
  contacts: ContactTagInput[];
}

export function classifyLead(input: ClassifyLeadInput): LeadCategory {
  if (input.pipelineStage === "new" && input.contacts.length === 0) return "untouched";

  let anyNoWa = false;
  let anyAppointment = false;
  let anyDeclined = false;
  let anyNeedsReply = false;
  let anyRepliedBot = false;
  let anyOtherContact = false;
  let anyFollowUp = false;
  let anyLetterSent = false;
  let anyNoReplyAfterPitch = false;
  let anyNonResponsive = false;

  for (const c of input.contacts) {
    if (c.noWaAccount) anyNoWa = true;
    if (c.appointment) anyAppointment = true;
    if (c.declined) anyDeclined = true;
    if (c.needsOtherContact) anyOtherContact = true;
    if (c.needsFollowUp) anyFollowUp = true;
    if (c.letterSent) anyLetterSent = true;
    if (c.noReplyAfterPitch) anyNoReplyAfterPitch = true;
    if (c.nonResponsive) anyNonResponsive = true;

    const lastMessage = c.lastMessage;
    const overrideActive =
      Boolean(c.repliedOverrideAt) && (!lastMessage || new Date(c.repliedOverrideAt!) >= new Date(lastMessage.sentAt));
    if (lastMessage?.direction === "inbound" && !overrideActive) anyNeedsReply = true;
    if (overrideActive && c.repliedOverrideKind === "bot") anyRepliedBot = true;
  }

  if (anyNoWa) return "no_wa_account";
  if (anyAppointment) return "appointment";
  if (anyDeclined) return "declined";
  if (anyNeedsReply) return "needs_reply";
  if (anyRepliedBot) return "replied_by_bot";
  if (anyOtherContact) return "needs_other_contact";
  if (anyFollowUp) return "needs_follow_up";
  if (anyLetterSent) return "letter_sent";
  if (anyNoReplyAfterPitch) return "no_reply_after_pitch";
  if (anyNonResponsive) return "non_responsive";
  return "active";
}
