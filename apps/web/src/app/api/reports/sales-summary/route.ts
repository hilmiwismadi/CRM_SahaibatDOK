import { NextResponse } from "next/server";
import { TRIAL_HEALTH_CHECK_INTERVAL_DAYS } from "@sahaibat/shared";
import { db } from "@/lib/db";

// First-pass heuristic for "needs a follow-up" — not a modeled business
// rule like the trial check-in interval, just a reasonable default for
// flagging leads nobody has touched in a while. Excludes terminal stages.
const STALE_LEAD_DAYS = 14;

// Chat-silence-specific version of "stale": contacted (or further) but no
// reply for this many days. Deliberately separate from STALE_LEAD_DAYS
// above (which fires on ANY field going untouched) — this one is scoped to
// the WhatsApp thread going quiet, computed fresh on every load rather
// than stored as a tag (see Context/SahaibatExplanation/6.ReportsDashboardPlan.md
// §5.2 for why this is computed-only, not a persisted flag like
// needsOtherContact/needsFollowUp/noWaAccount).
const GHOSTED_DAYS = 7;

export async function GET() {
  const stageDefs = await db.pipelineStageDef.findMany({ orderBy: { sortOrder: "asc" } });
  const terminalKeys = stageDefs.filter((s) => s.isTerminal).map((s) => s.key);

  const trialCheckinCutoff = new Date(Date.now() - TRIAL_HEALTH_CHECK_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
  const staleCutoff = new Date(Date.now() - STALE_LEAD_DAYS * 24 * 60 * 60 * 1000);
  const ghostedCutoff = new Date(Date.now() - GHOSTED_DAYS * 24 * 60 * 60 * 1000);

  const [
    stageCounts,
    trialCheckinOverdue,
    staleLeads,
    totalActiveConversations,
    contactsWithLastMessage,
    leadsForReachability,
    contactedOrLaterCount,
    respondedCount,
    activeStageLeads,
  ] = await Promise.all([
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
    // Same filter as GET /api/conversations — a lead-linked contact with at
    // least one message, OR flagged noWaAccount even with zero messages.
    db.waContact.count({
      where: { lead: { isNot: null }, OR: [{ messages: { some: {} } }, { noWaAccount: true }] },
    }),
    // Last message per lead-linked contact — same shape /api/conversations
    // uses to derive needsReply/repliedByBot, reused here rather than
    // re-derived so the two pages can never disagree on these counts.
    db.waContact.findMany({
      where: { lead: { isNot: null } },
      select: {
        repliedOverrideAt: true,
        repliedOverrideKind: true,
        needsOtherContact: true,
        needsFollowUp: true,
        letterSent: true,
        noWaAccount: true,
        messages: { orderBy: { sentAt: "desc" }, take: 1, select: { direction: true, sentAt: true } },
      },
    }),
    // Reachability breakdown — must match /map's pinColor()/isLikelyLandline
    // classification (brown pin = noWaAccount OR no phone at all) so the
    // two pages never disagree on this number either.
    db.lead.findMany({ select: { phoneNormalized: true, waContacts: { select: { noWaAccount: true } } } }),
    db.lead.count({ where: { pipelineStage: { not: "new" } } }),
    db.lead.count({
      where: { pipelineStage: { not: "new" }, waContacts: { some: { messages: { some: { direction: "inbound" } } } } },
    }),
    // Candidates for the "ghosted" list — anything past "new" and not a
    // terminal (won/rejected) stage.
    db.lead.findMany({
      where: { pipelineStage: { notIn: [...terminalKeys, "new"] } },
      select: {
        id: true,
        name: true,
        pipelineStage: true,
        waContacts: {
          select: {
            messages: { select: { direction: true, sentAt: true }, orderBy: { sentAt: "desc" } },
          },
        },
      },
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

  // Tag counts + live needsReply, all derived from the same
  // last-message-per-contact fetch above (identical logic to
  // GET /api/conversations).
  let needsReplyCount = 0;
  let repliedByBotCount = 0;
  let needsOtherContactCount = 0;
  let needsFollowUpCount = 0;
  let letterSentCount = 0;
  let noWaAccountTagCount = 0;
  for (const c of contactsWithLastMessage) {
    const lastMessage = c.messages[0] ?? null;
    const overrideActive = Boolean(c.repliedOverrideAt) && (!lastMessage || c.repliedOverrideAt! >= lastMessage.sentAt);
    if (lastMessage?.direction === "inbound" && !overrideActive) needsReplyCount++;
    if (overrideActive && c.repliedOverrideKind === "bot") repliedByBotCount++;
    if (c.needsOtherContact) needsOtherContactCount++;
    if (c.needsFollowUp) needsFollowUpCount++;
    if (c.letterSent) letterSentCount++;
    if (c.noWaAccount) noWaAccountTagCount++;
  }

  const totalLeadsCount = leadsForReachability.length;
  const noPhoneCount = leadsForReachability.filter((l) => !l.phoneNormalized).length;
  const noWaAccountLeadCount = leadsForReachability.filter(
    (l) => l.phoneNormalized && l.waContacts.some((wc) => wc.noWaAccount),
  ).length;
  const reachableCount = totalLeadsCount - noPhoneCount - noWaAccountLeadCount;

  const ghostedLeads = activeStageLeads
    .map((l) => {
      const messages = l.waContacts.flatMap((wc) => wc.messages);
      const lastOutbound = messages.filter((m) => m.direction === "outbound").sort((a, b) => +b.sentAt - +a.sentAt)[0];
      const lastInbound = messages.filter((m) => m.direction === "inbound").sort((a, b) => +b.sentAt - +a.sentAt)[0];
      if (!lastOutbound) return null; // never actually messaged — not "ghosted", just not started
      if (lastOutbound.sentAt > ghostedCutoff) return null; // too recent to call it silence yet
      if (lastInbound && lastInbound.sentAt >= lastOutbound.sentAt) return null; // they did reply
      return { id: l.id, name: l.name, pipelineStage: l.pipelineStage, lastOutboundAt: lastOutbound.sentAt };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => +a.lastOutboundAt - +b.lastOutboundAt);

  return NextResponse.json({
    totalLeads: stageCounts.reduce((sum, s) => sum + s._count._all, 0),
    stages,
    kpi: {
      totalActiveConversations,
      needsReplyCount,
      unreachableCount: noPhoneCount + noWaAccountLeadCount,
      responseRate: contactedOrLaterCount > 0 ? respondedCount / contactedOrLaterCount : 0,
    },
    reachability: {
      total: totalLeadsCount,
      reachable: reachableCount,
      noPhone: noPhoneCount,
      noWaAccount: noWaAccountLeadCount,
    },
    tags: {
      needsReply: needsReplyCount,
      repliedByBot: repliedByBotCount,
      needsOtherContact: needsOtherContactCount,
      needsFollowUp: needsFollowUpCount,
      letterSent: letterSentCount,
      noWaAccount: noWaAccountTagCount,
    },
    followUps: {
      trialCheckinOverdue,
      staleLeads,
      ghostedLeads,
    },
  });
}
