import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Last-resort disaster recovery: wipes every CRM table and reloads it from
 * a backup-json.ts snapshot. DESTRUCTIVE and irreversible — only run this
 * against a database you intend to fully replace (e.g. a freshly-restored
 * empty VPS database, or recovering from a confirmed local data loss). See
 * Context/SahaibatExplanation/5.DataBackupGuide.md before running this.
 *
 * Requires --yes to actually run — bare `npm run restore-backup` just
 * prints what it would do and exits, so it can never fire by accident.
 *
 * Inserts happen in FK-safe order (parents before children). Lead <->
 * LeadContactNode is circular (lead.activeContactNodeId <-> node.leadId),
 * so both are inserted once with the circular pointer left null, then
 * patched in a second pass once both sides exist.
 */

const DEFAULT_FILE = path.join(process.cwd(), "backups", "backup-latest.json");

async function main() {
  const yes = process.argv.includes("--yes");
  const fileArg = process.argv.find((a) => a.startsWith("--file="));
  const file = fileArg ? fileArg.slice("--file=".length) : DEFAULT_FILE;

  if (!yes) {
    console.error(
      [
        "*** THIS DELETES ALL CURRENT LEADS/MESSAGES/CONTACTS/TEMPLATES ***",
        "and replaces them with the contents of the backup file below.",
        "This cannot be undone — make sure you mean it.",
        "",
        `Backup file: ${file}`,
        "",
        "Re-run with --yes to actually proceed:",
        "  npm run restore-backup -- --yes",
        "Or point at a different file:",
        "  npm run restore-backup -- --yes --file=./backups/backup-2026-09-07.json",
      ].join("\n"),
    );
    process.exit(1);
  }

  const backup = JSON.parse(readFileSync(file, "utf-8"));
  console.log(`Restoring from ${file} (generated ${backup.generatedAt})`);
  console.log("Counts in file:", backup.counts);

  const db = new PrismaClient();
  try {
    await db.$transaction(
      async (tx) => {
        // 1. Wipe, children first.
        await tx.waMessage.deleteMany();
        await tx.leadActivity.deleteMany();
        await tx.lead.updateMany({ data: { activeContactNodeId: null } });
        await tx.leadContactNode.updateMany({ data: { parentId: null } });
        await tx.leadContactNode.deleteMany();
        await tx.waContact.deleteMany();
        await tx.lead.deleteMany();
        await tx.pipelineTransitionDef.deleteMany();
        await tx.pipelineStageDef.deleteMany();
        await tx.messageTemplate.deleteMany();

        // 2. Reinsert, parents first. Circular Lead<->LeadContactNode
        // pointers are dropped here and patched in step 3.
        for (const row of backup.pipelineStageDefs ?? []) {
          await tx.pipelineStageDef.create({ data: row });
        }
        for (const row of backup.pipelineTransitionDefs ?? []) {
          await tx.pipelineTransitionDef.create({ data: row });
        }
        for (const row of backup.leads ?? []) {
          await tx.lead.create({ data: { ...row, activeContactNodeId: null } });
        }
        for (const row of backup.waContacts ?? []) {
          await tx.waContact.create({ data: row });
        }
        for (const row of backup.leadContactNodes ?? []) {
          await tx.leadContactNode.create({ data: { ...row, parentId: null } });
        }

        // 3. Patch the circular pointers now that both sides exist.
        for (const row of backup.leadContactNodes ?? []) {
          if (row.parentId) {
            await tx.leadContactNode.update({ where: { id: row.id }, data: { parentId: row.parentId } });
          }
        }
        for (const row of backup.leads ?? []) {
          if (row.activeContactNodeId) {
            await tx.lead.update({ where: { id: row.id }, data: { activeContactNodeId: row.activeContactNodeId } });
          }
        }

        // 4. Everything else — no ordering constraints left.
        for (const row of backup.waMessages ?? []) {
          await tx.waMessage.create({ data: row });
        }
        for (const row of backup.leadActivities ?? []) {
          await tx.leadActivity.create({ data: row });
        }
        for (const row of backup.messageTemplates ?? []) {
          await tx.messageTemplate.create({ data: row });
        }
      },
      { timeout: 120_000 },
    );

    console.log("Restore complete.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("Restore failed — database may be partially restored (the transaction rolls back on error, so it should still be either fully old or fully new, never a mix, but verify row counts):", err);
  process.exit(1);
});
