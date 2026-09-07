-- AlterTable
-- Standing flag: WhatsApp isn't working for this lead and they need to be
-- reached another way (email, phone, etc). Unlike replied_override_at, this
-- does not auto-expire on a new inbound message — see schema.prisma.
ALTER TABLE "wa_contacts" ADD COLUMN "needs_other_contact" BOOLEAN NOT NULL DEFAULT false;
