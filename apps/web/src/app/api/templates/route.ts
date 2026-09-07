import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export async function GET() {
  const templates = await db.messageTemplate.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ templates });
}

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1).default("general"),
  message: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const template = await db.messageTemplate.create({ data: parsed.data });
    return NextResponse.json({ template });
  } catch {
    return NextResponse.json({ error: "A template with that name already exists" }, { status: 409 });
  }
}
