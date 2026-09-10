-- AlterTable
-- Standing flag: confirmed this number has no WhatsApp account (e.g. a
-- landline scraped as the lead's phone). Same semantics as
-- needs_other_contact/needs_follow_up — see schema.prisma.
ALTER TABLE "wa_contacts" ADD COLUMN "no_wa_account" BOOLEAN NOT NULL DEFAULT false;
