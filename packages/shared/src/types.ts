/**
 * Pipeline stages are NOT a hardcoded enum — they're config data in the
 * `pipeline_stage_defs` / `pipeline_transition_defs` tables (see
 * apps/web/prisma/schema.prisma and docs/ARCHITECTURE.md "Pipeline
 * stages"), so a new stage can be added later without a code change. The
 * frontend fetches the live list via GET /api/pipeline-stages; this type
 * just describes the shape of one row.
 */
export interface PipelineStageDef {
  key: string;
  label: string;
  color: string; // hex
  sortOrder: number;
  isTerminal: boolean;
}

export interface PipelineTransitionDef {
  fromKey: string;
  toKey: string;
  label: string;
}

/** Seed data for the initial stage catalog — applied via the Prisma
 * migration, not read at runtime. Kept here as the single documented
 * source of what "the default flow" is, for reference when adding more. */
export const SEED_PIPELINE_STAGES: PipelineStageDef[] = [
  { key: "new", label: "New", color: "#94a3b8", sortOrder: 10, isTerminal: false },
  { key: "contacted", label: "Contacted", color: "#38bdf8", sortOrder: 20, isTerminal: false },
  { key: "responded", label: "Responded", color: "#22d3ee", sortOrder: 30, isTerminal: false },
  { key: "meeting_aligned", label: "Meeting Aligned", color: "#facc15", sortOrder: 40, isTerminal: false },
  { key: "client_deciding_trial", label: "Client Deciding on Trial", color: "#fb923c", sortOrder: 50, isTerminal: false },
  { key: "trial_rejected", label: "Trial Rejected", color: "#64748b", sortOrder: 60, isTerminal: true },
  { key: "trial_accepted", label: "Trial Accepted", color: "#f472b6", sortOrder: 70, isTerminal: false },
  { key: "offer_payment", label: "Offer Payment", color: "#818cf8", sortOrder: 80, isTerminal: false },
];

export const SEED_PIPELINE_TRANSITIONS: PipelineTransitionDef[] = [
  { fromKey: "new", toKey: "contacted", label: "Mark Contacted" },
  { fromKey: "contacted", toKey: "responded", label: "Mark Responded" },
  { fromKey: "responded", toKey: "meeting_aligned", label: "Align Meeting" },
  { fromKey: "meeting_aligned", toKey: "client_deciding_trial", label: "Demo Done — Awaiting Decision" },
  { fromKey: "client_deciding_trial", toKey: "trial_rejected", label: "Reject Trial" },
  { fromKey: "client_deciding_trial", toKey: "trial_accepted", label: "Accept Trial" },
  // trial_accepted -> offer_payment is normally automatic 25 days after
  // trialStartedAt (see checkTrialTransitions in the web app), but this
  // transition is still listed so a manual override button is available.
  { fromKey: "trial_accepted", toKey: "offer_payment", label: "Move to Offer Payment" },
];

/**
 * Sub-status tracked only while pipelineStage = "trial_accepted", updated
 * roughly every 3 days. This is intentionally a narrow fixed set (unlike
 * pipeline stages) — extend here plus the Postgres check if it ever needs
 * to grow.
 */
export const TRIAL_HEALTH_STATUSES = [
  "actively_using",
  "need_checkup",
  "not_actively_using",
] as const;

export type TrialHealthStatus = (typeof TRIAL_HEALTH_STATUSES)[number];

export const TRIAL_HEALTH_STATUS_LABELS: Record<TrialHealthStatus, string> = {
  actively_using: "Actively Using",
  need_checkup: "Needs Checkup",
  not_actively_using: "Not Actively Using",
};

/** Days between required trial health check-ins. */
export const TRIAL_HEALTH_CHECK_INTERVAL_DAYS = 3;

/** Days after trialStartedAt before auto-transitioning to "offer_payment". */
export const TRIAL_OFFER_PAYMENT_AFTER_DAYS = 25;

export type LeadActivityType =
  | "stage_change"
  | "note"
  | "wa_message_sent"
  | "wa_message_received"
  | "scrape_update"
  | "manual_edit"
  | "trial_health_update";

export type WaMessageDirection = "inbound" | "outbound";

export interface LeadSummary {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  phoneNormalized: string | null;
  lat: number;
  lng: number;
  pipelineStage: string;
  rating: number | null;
  reviewCount: number | null;
}
