-- AlterTable
-- Derived location grouping field — see src/lib/provinceExtract.ts.
ALTER TABLE "leads" ADD COLUMN "province" TEXT;

-- CreateIndex
CREATE INDEX "leads_province_idx" ON "leads"("province");
