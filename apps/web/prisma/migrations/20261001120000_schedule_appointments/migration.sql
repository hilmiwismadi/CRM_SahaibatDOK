-- AlterTable
ALTER TABLE "wa_contacts" ADD COLUMN "follow_up_has_time" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "lead_appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "duration_min" INTEGER NOT NULL DEFAULT 60,
    "location" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_appointments_starts_idx" ON "lead_appointments"("starts_at");

-- CreateIndex
CREATE INDEX "lead_appointments_lead_idx" ON "lead_appointments"("lead_id");

-- AddForeignKey
ALTER TABLE "lead_appointments" ADD CONSTRAINT "lead_appointments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
