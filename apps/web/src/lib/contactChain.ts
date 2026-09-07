import { db } from "@/lib/db";
import { Prisma, type LeadContactNode } from "@prisma/client";

/**
 * Lazily creates the auto-seeded "root" contact node for a lead — the one
 * representing whatever contact the scraper originally found. Safe to call
 * repeatedly; existing leads never need a backfill migration because this
 * runs on first access instead.
 *
 * A lead's first-ever page load can fire several requests in parallel that
 * each call this (e.g. GET /messages and GET /contacts at once), so a
 * plain "find, else create" is racy: two calls can both see no existing
 * root and both try to create one. A DB-level partial unique index
 * (migrations/20260907070000_unique_root_contact_node) makes the loser's
 * insert fail instead of silently succeeding as a duplicate — caught below
 * and turned into a re-fetch of the row the winner created. `orderBy` is
 * belt-and-suspenders determinism for any pre-existing data.
 */
export async function ensureRootContactNode(leadId: string): Promise<LeadContactNode> {
  const existing = await db.leadContactNode.findFirst({
    where: { leadId, isRoot: true },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  const lead = await db.lead.findUniqueOrThrow({ where: { id: leadId } });
  try {
    return await db.leadContactNode.create({
      data: {
        leadId,
        isRoot: true,
        phoneNormalized: lead.phoneNormalized,
        displayName: lead.name,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const winner = await db.leadContactNode.findFirst({
        where: { leadId, isRoot: true },
        orderBy: { createdAt: "asc" },
      });
      if (winner) return winner;
    }
    throw err;
  }
}

/**
 * Resolves "whichever contact is currently active for chat purposes" for a
 * lead. `Lead.activeContactNodeId = null` is the permanent steady-state
 * default meaning "use the root node" — it is never eagerly backfilled.
 */
export async function getActiveContactNode(leadId: string): Promise<LeadContactNode> {
  const lead = await db.lead.findUniqueOrThrow({
    where: { id: leadId },
    include: { activeContactNode: true },
  });
  if (lead.activeContactNode) return lead.activeContactNode;
  return ensureRootContactNode(leadId);
}
