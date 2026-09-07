-- AlterTable
-- Manual "mark as replied" override — see the model doc comment in
-- schema.prisma for when/why this is used.
ALTER TABLE "wa_contacts" ADD COLUMN "replied_override_at" TIMESTAMP(3);
