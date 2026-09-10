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
 * deliberately: confirmed dead-end (no_wa_account) and the one positive
 * milestone (appointment) first since they're the most actionable/rare,
 * then the "needs a reply" urgency signals, then the two standing-note
 * tags, then the catch-all "active" (touched, ongoing, no special flag).
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
  | "needs_reply"
  | "replied_by_bot"
  | "needs_other_contact"
  | "needs_follow_up"
  | "active";

export const CATEGORY_ORDER: LeadCategory[] = [
  "untouched",
  "no_wa_account",
  "appointment",
  "needs_reply",
  "replied_by_bot",
  "needs_other_contact",
  "needs_follow_up",
  "active",
];

export const CATEGORY_LABELS: Record<LeadCategory, string> = {
  untouched: "Belum Disentuh",
  no_wa_account: "Tidak Ada Kontak WA",
  appointment: "Appointment",
  needs_reply: "Belum Dijawab",
  replied_by_bot: "Dijawab Bot",
  needs_other_contact: "Perlu Kontak Lain",
  needs_follow_up: "Butuh Follow Up",
  active: "Aktif",
};

export const CATEGORY_COLORS: Record<LeadCategory, string> = {
  untouched: "#94a3b8", // slate-400
  no_wa_account: "#6b7280", // gray-500
  appointment: "#10b981", // emerald-500
  needs_reply: "#ef4444", // red-500
  replied_by_bot: "#8b5cf6", // violet-500
  needs_other_contact: "#f59e0b", // amber-500
  needs_follow_up: "#0ea5e9", // sky-500
  active: "#0891b2", // cyan-600
};

export interface ContactTagInput {
  noWaAccount: boolean;
  appointment: boolean;
  needsOtherContact: boolean;
  needsFollowUp: boolean;
  repliedOverrideAt: Date | string | null;
  repliedOverrideKind: string | null;
  lastMessage: { direction: string; sentAt: Date | string } | null;
}

export interface ClassifyLeadInput {
  pipelineStage: string;
  contacts: ContactTagInput[];
}

export function classifyLead(input: ClassifyLeadInput): LeadCategory {
  if (input.pipelineStage === "new" && input.contacts.length === 0) return "untouched";

  let anyNoWa = false;
  let anyAppointment = false;
  let anyNeedsReply = false;
  let anyRepliedBot = false;
  let anyOtherContact = false;
  let anyFollowUp = false;

  for (const c of input.contacts) {
    if (c.noWaAccount) anyNoWa = true;
    if (c.appointment) anyAppointment = true;
    if (c.needsOtherContact) anyOtherContact = true;
    if (c.needsFollowUp) anyFollowUp = true;

    const lastMessage = c.lastMessage;
    const overrideActive =
      Boolean(c.repliedOverrideAt) && (!lastMessage || new Date(c.repliedOverrideAt!) >= new Date(lastMessage.sentAt));
    if (lastMessage?.direction === "inbound" && !overrideActive) anyNeedsReply = true;
    if (overrideActive && c.repliedOverrideKind === "bot") anyRepliedBot = true;
  }

  if (anyNoWa) return "no_wa_account";
  if (anyAppointment) return "appointment";
  if (anyNeedsReply) return "needs_reply";
  if (anyRepliedBot) return "replied_by_bot";
  if (anyOtherContact) return "needs_other_contact";
  if (anyFollowUp) return "needs_follow_up";
  return "active";
}
