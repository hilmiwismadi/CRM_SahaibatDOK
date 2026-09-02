-- NOTE: the auto-generated diff also proposed `DROP INDEX "leads_geom_gist"`
-- because that GiST index was hand-added in the init migration and isn't
-- expressible in schema.prisma (Unsupported type). Deliberately omitted
-- here — do not drop it.

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "trial_health_status" TEXT,
ADD COLUMN     "trial_health_updated_at" TIMESTAMP(3),
ADD COLUMN     "trial_started_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "pipeline_stage_defs" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_stage_defs_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "pipeline_transition_defs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_key" TEXT NOT NULL,
    "to_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "pipeline_transition_defs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_transition_defs_from_key_to_key_key" ON "pipeline_transition_defs"("from_key", "to_key");

-- CreateIndex
CREATE INDEX "leads_trial_started_idx" ON "leads"("trial_started_at");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_pipeline_stage_fkey" FOREIGN KEY ("pipeline_stage") REFERENCES "pipeline_stage_defs"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_transition_defs" ADD CONSTRAINT "pipeline_transition_defs_from_key_fkey" FOREIGN KEY ("from_key") REFERENCES "pipeline_stage_defs"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_transition_defs" ADD CONSTRAINT "pipeline_transition_defs_to_key_fkey" FOREIGN KEY ("to_key") REFERENCES "pipeline_stage_defs"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed data: default stage catalog and allowed transitions. Kept in sync
-- with packages/shared/src/types.ts SEED_PIPELINE_STAGES /
-- SEED_PIPELINE_TRANSITIONS — that file is the documented source of truth
-- for what this seed represents; add new stages via a fresh migration
-- (INSERT INTO pipeline_stage_defs ...), not by editing this file.
INSERT INTO "pipeline_stage_defs" ("key", "label", "color", "sort_order", "is_terminal") VALUES
    ('new', 'New', '#94a3b8', 10, false),
    ('contacted', 'Contacted', '#38bdf8', 20, false),
    ('responded', 'Responded', '#22d3ee', 30, false),
    ('meeting_aligned', 'Meeting Aligned', '#facc15', 40, false),
    ('client_deciding_trial', 'Client Deciding on Trial', '#fb923c', 50, false),
    ('trial_rejected', 'Trial Rejected', '#64748b', 60, true),
    ('trial_accepted', 'Trial Accepted', '#f472b6', 70, false),
    ('offer_payment', 'Offer Payment', '#818cf8', 80, false);

INSERT INTO "pipeline_transition_defs" ("from_key", "to_key", "label") VALUES
    ('new', 'contacted', 'Mark Contacted'),
    ('contacted', 'responded', 'Mark Responded'),
    ('responded', 'meeting_aligned', 'Align Meeting'),
    ('meeting_aligned', 'client_deciding_trial', 'Demo Done — Awaiting Decision'),
    ('client_deciding_trial', 'trial_rejected', 'Reject Trial'),
    ('client_deciding_trial', 'trial_accepted', 'Accept Trial'),
    ('trial_accepted', 'offer_payment', 'Move to Offer Payment');
