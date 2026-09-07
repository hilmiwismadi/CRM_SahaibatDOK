-- AlterTable
-- phone_office: office/landline number, stored as-typed (not E.164
-- normalized like phone_normalized, which assumes a mobile number shape).
-- business_type: internal sales classification, e.g. "solo_doctor" |
-- "klinik_pratama" — free text like pipeline_stage_defs' philosophy.
ALTER TABLE "leads" ADD COLUMN "phone_office" TEXT;
ALTER TABLE "leads" ADD COLUMN "instagram_url" TEXT;
ALTER TABLE "leads" ADD COLUMN "business_type" TEXT;
