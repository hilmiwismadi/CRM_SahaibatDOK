import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z
  .object({
    needsOtherContact: z.boolean().optional(),
    needsFollowUp: z.boolean().optional(),
    noWaAccount: z.boolean().optional(),
    appointment: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.needsOtherContact !== undefined ||
      v.needsFollowUp !== undefined ||
      v.noWaAccount !== undefined ||
      v.appointment !== undefined,
    { message: "At least one of needsOtherContact, needsFollowUp, noWaAccount, or appointment is required" },
  );

/**
 * Toggles standing, independent conversation flags — "needs other contact"
 * (WhatsApp isn't working for this lead, try email/phone/other instead),
 * "needs follow-up" (proactively check back with this lead), "no WA
 * account" (confirmed this number has no WhatsApp at all — a factual
 * dead-end, e.g. a landline scraped as the lead's phone), and "appointment"
 * (a meeting has been scheduled — the one positive flag among these).
 * Separate from the /replied route: unlike that override, none of these
 * auto-expire on a new inbound message — see schema.prisma's WaContact doc
 * comments.
 *
 * Each actual value change is logged to lead_activities (type
 * "tag_change") — these 4 flags are plain booleans with no timestamp
 * column of their own, so this log is the only way to answer "when did
 * this lead get flagged X" later (backs /reports/kanban-history's
 * per-date/per-week breakdown). Skipped when the contact isn't linked to
 * a lead yet (lead_activities.lead_id is NOT NULL) or when a field is
 * sent but its value doesn't actually change.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { needsOtherContact, needsFollowUp, noWaAccount, appointment } = parsed.data;
  const data: {
    needsOtherContact?: boolean;
    needsFollowUp?: boolean;
    noWaAccount?: boolean;
    appointment?: boolean;
  } = {};
  if (needsOtherContact !== undefined) data.needsOtherContact = needsOtherContact;
  if (needsFollowUp !== undefined) data.needsFollowUp = needsFollowUp;
  if (noWaAccount !== undefined) data.noWaAccount = noWaAccount;
  if (appointment !== undefined) data.appointment = appointment;

  try {
    const contact = await db.$transaction(async (tx) => {
      const before = await tx.waContact.findUniqueOrThrow({
        where: { id },
        select: { needsOtherContact: true, needsFollowUp: true, noWaAccount: true, appointment: true, leadId: true },
      });

      const updated = await tx.waContact.update({ where: { id }, data });

      if (updated.leadId) {
        const changed = (Object.entries(data) as [keyof typeof data, boolean][]).filter(
          ([tag, value]) => before[tag] !== value,
        );
        for (const [tag, value] of changed) {
          await tx.leadActivity.create({
            data: { leadId: updated.leadId, type: "tag_change", payload: { tag, value, waContactId: updated.id } },
          });
        }
      }

      return updated;
    });
    return NextResponse.json({ contact });
  } catch {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
}
