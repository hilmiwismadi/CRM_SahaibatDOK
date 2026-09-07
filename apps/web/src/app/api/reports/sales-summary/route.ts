import { NextResponse } from "next/server";
import { TRIAL_HEALTH_CHECK_INTERVAL_DAYS } from "@sahaibat/shared";
import { db } from "@/lib/db";

// First-pass heuristic for "needs a follow-up" — not a modeled business
// rule like the trial check-in interval, just a reasonable default for
// flagging leads nobody has touched in a while. Excludes terminal stages.
const STALE_LEAD_DAYS = 14;

export async function GET() {
  const stageDefs = await db.pipelineStageDef.findMany({ orderBy: { sortOrder: "asc" } });
  const terminalKeys = stageDefs.filter((s) => s.isTerminal).map((s) => s.key);

  const trialCheckinCutoff = new Date(Date.now() - TRIAL_HEALTH_CHECK_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
  const staleCutoff = new Date(Date.now() - STALE_LEAD_DAYS * 24 * 60 * 60 * 1000);

  const [stageCounts, trialCheckinOverdue, staleLeads] = await Promise.all([
    db.lead.groupBy({ by: ["pipelineStage"], _count: { _all: true } }),
    db.lead.findMany({
      where: {
        pipelineStage: "trial_accepted",
        OR: [{ trialHealthUpdatedAt: null }, { trialHealthUpdatedAt: { lt: trialCheckinCutoff } }],
      },
      select: { id: true, name: true, trialStartedAt: true, trialHealthUpdatedAt: true },
      orderBy: { trialHealthUpdatedAt: "asc" },
    }),
    db.lead.findMany({
      where: {
        pipelineStage: { notIn: terminalKeys },
        updatedAt: { lt: staleCutoff },
      },
      select: { id: true, name: true, pipelineStage: true, updatedAt: true },
      orderBy: { updatedAt: "asc" },
      take: 50,
    }),
  ]);

  const stageDefByKey = new Map(stageDefs.map((s) => [s.key, s]));
  const stages = stageCounts
    .map((sc) => {
      const def = stageDefByKey.get(sc.pipelineStage);
      return {
        key: sc.pipelineStage,
        count: sc._count._all,
        label: def?.label ?? sc.pipelineStage,
        color: def?.color ?? "#71717a",
        isTerminal: def?.isTerminal ?? false,
        sortOrder: def?.sortOrder ?? 999,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return NextResponse.json({
    totalLeads: stageCounts.reduce((sum, s) => sum + s._count._all, 0),
    stages,
    followUps: {
      trialCheckinOverdue,
      staleLeads,
    },
  });
}
