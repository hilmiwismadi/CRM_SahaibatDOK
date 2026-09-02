import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { mapGosomEntryToStagingRow, parseGosomNdjson } from "@/lib/gosomEntry";
import { upsertLeadsFromStaging } from "@/lib/upsertLeadsFromStaging";

// Only files inside <repo root>/scrape-output are readable — this endpoint
// takes a filename from the request body, so this stops '../' traversal.
// `web`'s cwd in dev is apps/web; in the standalone Docker image the repo
// root and app dir coincide, so both are checked.
const SCRAPE_OUTPUT_DIRS = [
  path.resolve(process.cwd(), "..", "..", "scrape-output"),
  path.resolve(process.cwd(), "scrape-output"),
];

const importSchema = z.object({
  scrapeJobId: z.string().uuid().optional(),
  fileName: z.string().min(1), // e.g. "yogyakarta-dokter-praktik-mandiri.json"
  queryText: z.string().min(1).optional(), // required if scrapeJobId omitted
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { fileName, queryText } = parsed.data;
  let { scrapeJobId } = parsed.data;

  if (path.basename(fileName) !== fileName) {
    return NextResponse.json({ error: "fileName must not contain path separators" }, { status: 400 });
  }

  let filePath: string | null = null;
  for (const dir of SCRAPE_OUTPUT_DIRS) {
    const candidate = path.join(dir, fileName);
    try {
      await readFile(candidate);
      filePath = candidate;
      break;
    } catch {
      // try next candidate dir
    }
  }
  if (!filePath) {
    return NextResponse.json({ error: `File not found in scrape-output/: ${fileName}` }, { status: 404 });
  }

  if (!scrapeJobId) {
    if (!queryText) {
      return NextResponse.json({ error: "queryText required when scrapeJobId is omitted" }, { status: 400 });
    }
    const job = await db.scrapeJob.create({ data: { queryText, status: "running" } });
    scrapeJobId = job.id;
  }

  const content = await readFile(filePath, "utf-8");
  const entries = parseGosomNdjson(content);
  const rows = entries.map((e) => mapGosomEntryToStagingRow(e, scrapeJobId!));

  await db.stgScrapeResult.createMany({ data: rows });

  const mergeSummary = await upsertLeadsFromStaging(scrapeJobId);

  const job = await db.scrapeJob.update({
    where: { id: scrapeJobId },
    data: {
      status: "imported",
      finishedAt: new Date(),
      rawResultCount: entries.length,
      newLeadCount: mergeSummary.newCount,
      updatedLeadCount: mergeSummary.updatedCount,
    },
  });

  return NextResponse.json({ job, mergeSummary });
}
