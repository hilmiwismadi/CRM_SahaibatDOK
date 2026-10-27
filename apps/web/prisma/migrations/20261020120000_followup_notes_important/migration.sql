-- AlterTable: bullet-list notes + "important leads" fields on followup_triage
ALTER TABLE "followup_triage"
  ADD COLUMN "notes" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "important_section" TEXT,
  ADD COLUMN "important_stage" TEXT,
  ADD COLUMN "important_status" TEXT,
  ADD COLUMN "no_follow_reason" TEXT;
