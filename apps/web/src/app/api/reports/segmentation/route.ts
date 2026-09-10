import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CATEGORY_LABELS, CATEGORY_ORDER, classifyLead, type LeadCategory } from "@/lib/leadSegmentation";

interface CardLead {
  id: string;
  name: string;
  phoneNormalized: string | null;
  pipelineStage: string;
  pipelineStageLabel: string;
  pipelineStageColor: string;
  lastMessageAt: string | null;
}

/**
 * Funnel + Kanban data source — one query, classified once via the shared
 * classifyLead() (see apps/web/src/lib/leadSegmentation.ts), so /reports'
 * "Segmentasi Leads" section and /reports/kanban's columns can never
 * disagree. See that file's doc comment for the full classification rules.
 */
export async function GET() {
  const leads = await db.lead.findMany({
    select: {
      id: true,
      name: true,
      phoneNormalized: true,
      pipelineStage: true,
      pipelineStageDef: { select: { label: true, color: true } },
      waContacts: {
        select: {
          noWaAccount: true,
          appointment: true,
          needsOtherContact: true,
          needsFollowUp: true,
          repliedOverrideAt: true,
          repliedOverrideKind: true,
          messages: { orderBy: { sentAt: "desc" }, take: 1, select: { direction: true, sentAt: true } },
        },
      },
    },
  });

  const buckets = Object.fromEntries(CATEGORY_ORDER.map((k) => [k, [] as CardLead[]])) as Record<
    LeadCategory,
    CardLead[]
  >;

  for (const l of leads) {
    const category = classifyLead({
      pipelineStage: l.pipelineStage,
      contacts: l.waContacts.map((c) => ({
        noWaAccount: c.noWaAccount,
        appointment: c.appointment,
        needsOtherContact: c.needsOtherContact,
        needsFollowUp: c.needsFollowUp,
        repliedOverrideAt: c.repliedOverrideAt,
        repliedOverrideKind: c.repliedOverrideKind,
        lastMessage: c.messages[0] ?? null,
      })),
    });

    const lastMessage = l.waContacts
      .flatMap((c) => c.messages)
      .sort((a, b) => +b.sentAt - +a.sentAt)[0];

    buckets[category].push({
      id: l.id,
      name: l.name,
      phoneNormalized: l.phoneNormalized,
      pipelineStage: l.pipelineStage,
      pipelineStageLabel: l.pipelineStageDef.label,
      pipelineStageColor: l.pipelineStageDef.color,
      lastMessageAt: lastMessage ? lastMessage.sentAt.toISOString() : null,
    });
  }

  const touchedKeys = CATEGORY_ORDER.filter((k) => k !== "untouched");
  const touchedCount = touchedKeys.reduce((sum, k) => sum + buckets[k].length, 0);

  return NextResponse.json({
    total: leads.length,
    untouched: { count: buckets.untouched.length, leads: buckets.untouched },
    touched: {
      count: touchedCount,
      categories: touchedKeys.map((key) => ({
        key,
        label: CATEGORY_LABELS[key],
        count: buckets[key].length,
        leads: buckets[key],
      })),
    },
  });
}
