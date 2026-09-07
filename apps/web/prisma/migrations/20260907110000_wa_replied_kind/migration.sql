-- AlterTable
-- Distinguishes a manual "mark as replied" from a "replied by bot" one —
-- see the model doc comment in schema.prisma for the expiry behavior both
-- share (a newer inbound message from the lead clears either one).
ALTER TABLE "wa_contacts" ADD COLUMN "replied_override_kind" TEXT;
