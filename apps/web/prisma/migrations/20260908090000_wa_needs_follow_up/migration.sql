-- AlterTable
-- Standing flag: this lead needs a proactive follow-up. Same semantics as
-- needs_other_contact (does not auto-expire on a new inbound message) —
-- see schema.prisma.
ALTER TABLE "wa_contacts" ADD COLUMN "needs_follow_up" BOOLEAN NOT NULL DEFAULT false;
