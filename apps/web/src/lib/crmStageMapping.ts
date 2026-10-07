/**
 * Tag (LeadCategory, see leadSegmentation.ts) -> suggested sales.sahaibat.com
 * CRM stage. Decided with the user 2026-09-30 — see Context/CRMSync/
 * 0.CRMSahaibatUnderstanding.md's "Goal 1" section for the full reasoning
 * (why trial/paid are deliberately excluded, why not_interested stays at
 * Contacted instead of Lost, etc). This is advisory only: /sync/dailylog
 * shows it as a suggestion next to each lead, it does not write anything to
 * sales.sahaibat.com by itself — see that doc's "anti-downgrade" rule
 * before ever wiring this up to an automatic PATCH.
 */

import type { LeadCategory } from "./leadSegmentation";

export type CrmStage = "Prospect" | "Contacted" | "Demo" | "Lost";

export const CATEGORY_TO_CRM_STAGE: Record<LeadCategory, CrmStage | null> = {
  untouched: null, // never synced — equivalent to pipeline_stage 'new', not yet worked at all
  no_wa_account: "Prospect",
  needs_reply: "Contacted", // "Belum Dijawab"
  replied_by_bot: "Contacted", // "Dijawab Bot"
  active: "Contacted", // "Perlu Diklasifikasi"
  no_reply_after_pitch: "Contacted", // "Not-Interested" — deliberately NOT Lost, lighter signal than declined
  needs_follow_up: "Contacted", // "Follow Up"
  needs_other_contact: "Contacted", // "Further Contact"
  letter_sent: "Contacted", // "Letter Sent"
  appointment: "Demo",
  declined: "Lost", // "Reject"
  non_responsive: "Lost",
};

export const CRM_STAGE_COLORS: Record<CrmStage, string> = {
  Prospect: "#64748b", // slate-500
  Contacted: "#0ea5e9", // sky-500
  Demo: "#8b5cf6", // violet-500
  Lost: "#dc2626", // red-600
};
