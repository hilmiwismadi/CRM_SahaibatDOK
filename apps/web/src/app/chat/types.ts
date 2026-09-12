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
