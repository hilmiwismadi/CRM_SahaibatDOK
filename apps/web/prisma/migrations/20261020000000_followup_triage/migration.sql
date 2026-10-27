-- CreateTable
CREATE TABLE "followup_triage" (
    "lead_id" UUID NOT NULL,
    "priority" TEXT NOT NULL,
    "action" TEXT,
    "due_date" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "snooze_until" TEXT,
    "source" TEXT NOT NULL DEFAULT 'claude',
    "triaged_on" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "followup_triage_pkey" PRIMARY KEY ("lead_id")
);

-- AddForeignKey
ALTER TABLE "followup_triage" ADD CONSTRAINT "followup_triage_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
