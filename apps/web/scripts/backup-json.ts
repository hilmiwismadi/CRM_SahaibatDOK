import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Dumps every CRM-owned table to one JSON file, overwritten on each run —
 * see Context/SahaibatExplanation/5.DataBackupGuide.md for when/why to run
 * this and how it relates to the pg_dump/pg_restore flow in
 * Context/SahaibatExplanation/4.ChatHistoryConcern.md.
 *
 * Deliberately excludes `scrape_jobs`/`stg_scrape_results` — raw scraper
 * staging data, never read by the UI and safe to regenerate by re-scraping;
 * including it here would bloat the backup without protecting anything a
 * lead's live state actually depends on.
 *
 * Also does not capture `leads.geom` (a PostGIS `Unsupported` column Prisma
 * can't read directly) — `lat`/`lng` (which ARE captured, and are what
 * /map actually renders from) are sufficient to reconstruct it if ever
 * needed. Full byte-for-byte fidelity, including geom, is what
 * pg_dump/pg_restore is for (see doc 4) — this JSON file is a secondary,
 * human-readable safety net, not a replacement for a real Postgres backup.
 */

const OUT_DIR = path.join(process.cwd(), "backups");
const OUT_FILE = path.join(OUT_DIR, "backup-latest.json");

async function main() {
  const db = new PrismaClient();
  try {
    const [
      pipelineStageDefs,
      pipelineTransitionDefs,
      leads,
      leadActivities,
      waContacts,
      waMessages,
      leadContactNodes,
      messageTemplates,
    ] = await Promise.all([
      db.pipelineStageDef.findMany(),
      db.pipelineTransitionDef.findMany(),
      db.lead.findMany(),
      db.leadActivity.findMany(),
      db.waContact.findMany(),
      db.waMessage.findMany(),
      db.leadContactNode.findMany(),
      db.messageTemplate.findMany(),
    ]);

    const backup = {
      generatedAt: new Date().toISOString(),
      counts: {
        pipelineStageDefs: pipelineStageDefs.length,
        pipelineTransitionDefs: pipelineTransitionDefs.length,
        leads: leads.length,
        leadActivities: leadActivities.length,
        waContacts: waContacts.length,
        waMessages: waMessages.length,
        leadContactNodes: leadContactNodes.length,
        messageTemplates: messageTemplates.length,
      },
      pipelineStageDefs,
      pipelineTransitionDefs,
      leads,
      leadActivities,
      waContacts,
      waMessages,
      leadContactNodes,
      messageTemplates,
    };

    mkdirSync(OUT_DIR, { recursive: true });
    // Write to a temp file then rename — an interrupted write (crash, disk
    // full, Ctrl+C mid-run) must never leave a half-written, corrupt
    // backup-latest.json sitting where a restore might read it.
    const tmpFile = `${OUT_FILE}.tmp`;
    writeFileSync(tmpFile, JSON.stringify(backup, null, 2), "utf-8");
    renameSync(tmpFile, OUT_FILE);

    console.log(`Backup written to ${OUT_FILE}`);
    console.log(backup.counts);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
