import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Surfaces the lead_activities table (stage changes, wa_message_sent/
 * received, manual edits, contact_chain_updated, scrape_update) as a
 * chronological activity log — this data was already being recorded, it
 * just wasn't shown anywhere. Backs /reports/history. See
 * Context/SahaibatExplanation/6.ReportsDashboardPlan.md §5 — this is what
 * confirmed CRM_Grad has no equivalent history view, so nothing to port,
 * just a UI on top of what Mapping already logs.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(Number(searchParams.get("days")) || 30, 1), 365);
  const type = searchParams.get("type") ?? "";
  const leadId = searchParams.get("leadId") ?? "";

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const activities = await db.leadActivity.findMany({
    where: {
      createdAt: { gte: since },
      ...(type && type !== "all" ? { type } : {}),
      ...(leadId ? { leadId } : {}),
    },
    include: { lead: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ activities });
}
