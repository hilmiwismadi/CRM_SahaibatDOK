-- AlterTable
-- Standing flag: a meeting/appointment has been scheduled with this lead —
-- a positive milestone, distinct from the other standing flags (all of
-- which mark problems). Same no-auto-expiry semantics — see schema.prisma.
ALTER TABLE "wa_contacts" ADD COLUMN "appointment" BOOLEAN NOT NULL DEFAULT false;
