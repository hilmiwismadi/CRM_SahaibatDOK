-- AlterTable
-- Manually-added leads (dashboard "+ Add Lead") have no geocoded
-- coordinates. /map already defensively filters null lat/lng.
ALTER TABLE "leads" ALTER COLUMN "lat" DROP NOT NULL;
ALTER TABLE "leads" ALTER COLUMN "lng" DROP NOT NULL;

-- CreateTable
CREATE TABLE "message_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_name_key" ON "message_templates"("name");
