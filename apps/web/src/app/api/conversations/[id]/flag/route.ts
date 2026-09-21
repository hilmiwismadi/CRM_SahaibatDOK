import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z
  .object({
    needsOtherContact: z.boolean().optional(),
    needsFollowUp: z.boolean().optional(),
    // ISO date ("YYYY-MM-DD") picked in /chat's follow-up-date prompt when
    // needsFollowUp is set to true — see schema.prisma's
    // WaContact.followUpAt. Only meaningful alongside needsFollowUp: true;
    // needsFollowUp: false always clears it below regardless of this.
    followUpAt: z.string().optional().nullable(),
    letterSent: z.boolean().optional(),
    noWaAccount: z.boolean().optional(),
    appointment: z.boolean().optional(),
    declined: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.needsOtherContact !== undefined ||
      v.needsFollowUp !== undefined ||
      v.letterSent !== undefined ||
      v.noWaAccount !== undefined ||
      v.appointment !== undefined ||
      v.declined !== undefined,
    {
      message:
        "At least one of needsOtherContact, needsFollowUp, letterSent, noWaAccount, appointment, or declined is required",
    },
  );

/**
 * Toggles standing, independent conversation flags — "needs other contact"
 * (WhatsApp isn't working for this lead, try email/phone/other instead),
 * "needs follow-up" (proactively check back with this lead), "letter sent"
 * (BD sent this lead a formal invitation letter, any channel), "no WA
 * account" (confirmed this number has no WhatsApp at all — a factual
 * dead-end, e.g. a landline scraped as the lead's phone), "appointment"
 * (a meeting has been scheduled), and "declined" (lead explicitly said no)
 * — appointment and declined are the two positive/negative outcomes among
 * these, the other four are standing notes. Separate from the /replied
 * route: unlike that override, none of these auto-expire on a new inbound
 * message — see schema.prisma's WaContact doc comments.
 *
 * Each actual value change is logged to lead_activities (type
 * "tag_change") — these flags are plain booleans with no timestamp
 * column of their own, so this log is the only way to answer "when did
 * this lead get flagged X" later (backs /reports/kanban-history's
 * per-date/per-week breakdown). Skipped when the contact isn't linked to
 * a lead yet (lead_activities.lead_id is NOT NULL) or when a field is
 * sent but its value doesn't actually change.
 *
 * needsFollowUp additionally accepts `followUpAt` (an ISO date the rep
 * picked in /chat's follow-up prompt) — stored on the contact and folded
 * into that same tag_change entry's payload, and backs GET
 * /api/leads/follow-up-reminders (the sidebar reminder popup). Always
 * cleared when needsFollowUp goes back to false.
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

  const { needsOtherContact, needsFollowUp, followUpAt, letterSent, noWaAccount, appointment, declined } = parsed.data;
  const boolData: {
    needsOtherContact?: boolean;
    needsFollowUp?: boolean;
    letterSent?: boolean;
    noWaAccount?: boolean;
    appointment?: boolean;
    declined?: boolean;
  } = {};
  if (needsOtherContact !== undefined) boolData.needsOtherContact = needsOtherContact;
  if (needsFollowUp !== undefined) boolData.needsFollowUp = needsFollowUp;
  if (letterSent !== undefined) boolData.letterSent = letterSent;
  if (noWaAccount !== undefined) boolData.noWaAccount = noWaAccount;
  if (appointment !== undefined) boolData.appointment = appointment;
  if (declined !== undefined) boolData.declined = declined;

  // A stale reminder date shouldn't linger behind a tag that's no longer
  // active — clearing needsFollowUp always clears followUpAt too, whether
  // or not the caller explicitly sent one.
  const data: typeof boolData & { followUpAt?: Date | null } = { ...boolData };
  if (needsFollowUp !== undefined) {
    data.followUpAt = needsFollowUp && followUpAt ? new Date(followUpAt) : null;
  }

  try {
    const contact = await db.$transaction(async (tx) => {
      const before = await tx.waContact.findUniqueOrThrow({
        where: { id },
        select: {
          needsOtherContact: true,
          needsFollowUp: true,
          letterSent: true,
          noWaAccount: true,
          appointment: true,
          declined: true,
          leadId: true,
        },
      });

      const updated = await tx.waContact.update({ where: { id }, data });

      if (updated.leadId) {
        const changed = (Object.entries(boolData) as [keyof typeof boolData, boolean][]).filter(
          ([tag, value]) => before[tag] !== value,
        );
        for (const [tag, value] of changed) {
          // The follow-up date rides along in the same activity entry as
          // the tag itself — /reports/history reads payload.followUpAt to
          // show "dijadwalkan untuk <tanggal>" instead of a bare "ditandai".
          const payload: { tag: string; value: boolean; waContactId: string; followUpAt?: string } = {
            tag,
            value,
            waContactId: updated.id,
          };
          if (tag === "needsFollowUp" && value && data.followUpAt) {
            payload.followUpAt = data.followUpAt.toISOString();
          }
          await tx.leadActivity.create({ data: { leadId: updated.leadId, type: "tag_change", payload } });
        }
      }

      return updated;
    });
    return NextResponse.json({ contact });
  } catch {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
}
