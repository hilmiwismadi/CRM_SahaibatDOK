import type { LeadCategory } from "@/lib/leadSegmentation";

export interface StageDefBrief {
  key: string;
  label: string;
  color: string;
}

export interface LeadBrief {
  id: string;
  name: string;
  pipelineStage: string;
  pipelineStageDef: StageDefBrief | null;
  // Extra fields from GET /api/leads/[id] (full Lead row) — shown in the chat
  // header's "Lead info" tooltip. Optional: conversation-list leads only carry
  // the brief fields above. `rating` is a Prisma Decimal, serialized as string.
  category?: string | null;
  address?: string | null;
  province?: string | null;
  rating?: string | number | null;
  reviewCount?: number | null;
  priceRange?: string | null;
  googleMapsUrl?: string | null;
  // "manual-<uuid>" for hand-added leads (no real Google place) — see
  // POST /api/leads.
  googlePlaceId?: string | null;
  website?: string | null;
  instagramUrl?: string | null;
  email?: string | null;
  phoneOffice?: string | null;
  businessType?: string | null;
  notes?: string | null;
}

export interface WaMessageItem {
  id: string;
  waContactId: string;
  waMessageId: string;
  direction: "inbound" | "outbound";
  body: string | null;
  messageType: string;
  sentAt: string;
  createdAt: string;
}

export interface ConversationListItem {
  id: string; // wa_contact id
  jid: string;
  phoneNormalized: string | null;
  displayName: string | null;
  lead: LeadBrief | null;
  lastMessage: WaMessageItem | null;
  needsReply: boolean;
  repliedByBot: boolean;
  needsOtherContact: boolean;
  needsFollowUp: boolean;
  // Date the rep picked when setting needsFollowUp — see schema.prisma's
  // WaContact.followUpAt. Null if never set (or the tag was cleared since).
  followUpAt: string | null;
  // Short "what to do" note saved with the follow-up — see
  // schema.prisma's WaContact.followUpNote.
  followUpNote: string | null;
  // True when followUpAt includes a specific time of day (else date-only).
  followUpHasTime: boolean;
  letterSent: boolean;
  noWaAccount: boolean;
  appointment: boolean;
  declined: boolean;
  // Computed, read-only — never toggled from the context menu, see
  // leadSegmentation.ts's nonResponsive/noReplyAfterPitch fields.
  nonResponsive: boolean;
  noReplyAfterPitch: boolean;
  // Single canonical classification (see @/lib/leadSegmentation's
  // classifyLead) — null only for the (rare) contact with no linked lead.
  tagCategory: LeadCategory | null;
}

export type Selected = { kind: "lead"; leadId: string } | { kind: "conversation"; conversationId: string };
