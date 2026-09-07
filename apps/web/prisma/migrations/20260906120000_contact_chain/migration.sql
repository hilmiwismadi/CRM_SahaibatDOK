-- AlterTable
-- Some @lid (phone-number-privacy) WhatsApp senders never resolve to a real
-- phone number via Baileys' lidMapping store — NULL means "unknown", not "".
ALTER TABLE "wa_contacts" ALTER COLUMN "phone_normalized" DROP NOT NULL;

-- AlterTable
-- CRM-owned pointer to the active LeadContactNode for chat purposes. NULL
-- means "use the auto-seeded root node" (see src/lib/contactChain.ts).
-- Deliberately not reusing phone_normalized, which the staging-import
-- upsert overwrites on every re-scrape.
ALTER TABLE "leads" ADD COLUMN "active_contact_node_id" UUID;

-- CreateTable
CREATE TABLE "lead_contact_nodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" UUID NOT NULL,
    "parent_id" UUID,
    "wa_contact_id" UUID,
    "phone_normalized" TEXT,
    "display_name" TEXT,
    "role" TEXT,
    "handoff_note" TEXT,
    "is_root" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_contact_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_contact_nodes_wa_contact_id_key" ON "lead_contact_nodes"("wa_contact_id");

-- CreateIndex
CREATE INDEX "lead_contact_nodes_lead_idx" ON "lead_contact_nodes"("lead_id");

-- CreateIndex
CREATE INDEX "lead_contact_nodes_phone_idx" ON "lead_contact_nodes"("phone_normalized");

-- AddForeignKey
ALTER TABLE "lead_contact_nodes" ADD CONSTRAINT "lead_contact_nodes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_contact_nodes" ADD CONSTRAINT "lead_contact_nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "lead_contact_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_contact_nodes" ADD CONSTRAINT "lead_contact_nodes_wa_contact_id_fkey" FOREIGN KEY ("wa_contact_id") REFERENCES "wa_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_active_contact_node_id_fkey" FOREIGN KEY ("active_contact_node_id") REFERENCES "lead_contact_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
