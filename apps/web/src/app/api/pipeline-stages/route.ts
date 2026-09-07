import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const stages = await db.pipelineStageDef.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ stages });
}
