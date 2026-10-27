-- CreateTable: history of reminder (followup_triage.notes) changes
CREATE TABLE "followup_note_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" UUID NOT NULL,
    "note_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "followup_note_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "followup_note_logs_lead_at_idx" ON "followup_note_logs"("lead_id", "at");

-- AddForeignKey
ALTER TABLE "followup_note_logs" ADD CONSTRAINT "followup_note_logs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: existing points get createdAt = when their triage row was created, plus an "added" log entry.
UPDATE "followup_triage" t
SET "notes" = (
  SELECT jsonb_agg(CASE WHEN n ? 'createdAt' THEN n
                        ELSE n || jsonb_build_object('createdAt', to_char(t."created_at", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) END
                   ORDER BY ord)
  FROM jsonb_array_elements(t."notes") WITH ORDINALITY AS e(n, ord)
)
WHERE jsonb_array_length(t."notes") > 0;

INSERT INTO "followup_note_logs" ("lead_id", "note_id", "action", "text", "at")
SELECT t."lead_id", n->>'id', 'added', n->>'text', t."created_at"
FROM "followup_triage" t, jsonb_array_elements(t."notes") AS n;
