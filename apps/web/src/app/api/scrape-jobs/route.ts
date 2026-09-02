import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export async function GET() {
  const jobs = await db.scrapeJob.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ jobs });
}

const createJobSchema = z.object({
  queryText: z.string().min(1),
  geoParams: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const job = await db.scrapeJob.create({
    data: {
      queryText: parsed.data.queryText,
      geoParams: parsed.data.geoParams as Prisma.InputJsonValue | undefined,
      status: "running",
    },
  });

  return NextResponse.json({ job }, { status: 201 });
}
