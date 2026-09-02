-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "google_place_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "address" TEXT,
    "phone_raw" TEXT,
    "phone_normalized" TEXT,
    "website" TEXT,
    "email" TEXT,
    "rating" DECIMAL(2,1),
    "review_count" INTEGER,
    "price_range" TEXT,
    "open_hours" JSONB,
    "google_maps_url" TEXT,
    "geom" geometry(Point, 4326),
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "first_scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_scraped_at" TIMESTAMP(3),
    "pipeline_stage" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "assigned_to" TEXT,
    "is_lost" BOOLEAN NOT NULL DEFAULT false,
    "lost_reason" TEXT,
    "custom_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wa_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jid" TEXT NOT NULL,
    "phone_normalized" TEXT NOT NULL,
    "lead_id" UUID,
    "display_name" TEXT,
    "linked_at" TIMESTAMP(3),

    CONSTRAINT "wa_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wa_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wa_contact_id" UUID NOT NULL,
    "wa_message_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "body" TEXT,
    "message_type" TEXT NOT NULL DEFAULT 'text',
    "raw_payload" JSONB,
    "sent_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wa_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrape_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "query_text" TEXT NOT NULL,
    "geo_params" JSONB,
    "status" TEXT NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "raw_result_count" INTEGER,
    "new_lead_count" INTEGER,
    "updated_lead_count" INTEGER,
    "notes" TEXT,

    CONSTRAINT "scrape_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stg_scrape_results" (
    "id" BIGSERIAL NOT NULL,
    "scrape_job_id" UUID,
    "google_place_id" TEXT,
    "name" TEXT,
    "category" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "email" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "rating" DECIMAL(2,1),
    "review_count" INTEGER,
    "price_range" TEXT,
    "open_hours" JSONB,
    "raw_json" JSONB,
    "imported_at" TIMESTAMP(3),

    CONSTRAINT "stg_scrape_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_google_place_id_key" ON "leads"("google_place_id");

-- CreateIndex (spatial — not expressible in schema.prisma, added by hand)
CREATE INDEX "leads_geom_gist" ON "leads" USING GIST ("geom");

-- CreateIndex
CREATE INDEX "leads_phone_idx" ON "leads"("phone_normalized");

-- CreateIndex
CREATE INDEX "leads_stage_idx" ON "leads"("pipeline_stage");

-- CreateIndex
CREATE INDEX "lead_activities_lead_idx" ON "lead_activities"("lead_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "wa_contacts_jid_key" ON "wa_contacts"("jid");

-- CreateIndex
CREATE INDEX "wa_contacts_phone_idx" ON "wa_contacts"("phone_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "wa_messages_wa_message_id_key" ON "wa_messages"("wa_message_id");

-- CreateIndex
CREATE INDEX "wa_messages_contact_idx" ON "wa_messages"("wa_contact_id", "sent_at");

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wa_contacts" ADD CONSTRAINT "wa_contacts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wa_messages" ADD CONSTRAINT "wa_messages_wa_contact_id_fkey" FOREIGN KEY ("wa_contact_id") REFERENCES "wa_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stg_scrape_results" ADD CONSTRAINT "stg_scrape_results_scrape_job_id_fkey" FOREIGN KEY ("scrape_job_id") REFERENCES "scrape_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

