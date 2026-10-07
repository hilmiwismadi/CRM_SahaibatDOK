import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.discriminatedUnion("action", [
  // Follow-up was handled (possibly outside this CRM — a phone call, a WA
  // sent from the paired phone, in person). Clears the tag + reminder.
  z.object({ action: z.literal("done"), note: z.string().max(300).optional() }),
  // Push the reminder to a later date without dropping the follow-up tag.
  // `until` is "YYYY-MM-DD" (date-only) or a full ISO datetime (specific time).
  z.object({
    action: z.literal("snooze"),
    until: z.string().regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2}))?$/),
  }),
  // Edit the short "what to do" note in place.
  z.object({ action: z.literal("note"), note: z.string().max(300) }),
]);

/**
 * Actions on an existing follow-up reminder (the sidebar's "Pengingat Follow
 * Up" popup). Separate from /flag, which sets/clears the tag itself with
 * a date — these three act on a follow-up that is already scheduled:
 *
 * - done:   needsFollowUp -> false, followUpAt/followUpNote cleared. Logs the
 *           usual tag_change (so kanban-history counts stay consistent with
 *           removing the tag from /chat) PLUS a follow_up_done activity that
 *           keeps the note and the date it was due, so "sudah dilakukan tapi
 *           tidak tertrack via chat" still leaves a trace.
 * - snooze: followUpAt -> `until`. The tag stays on; the reminder simply
 *           doesn't surface again until that date. Logged as
 *           follow_up_snoozed (NOT a tag_change — nothing was newly flagged,
 *           so kanban-history must not count it as a new follow-up).
 * - note:   followUpNote -> the given text (empty string clears it).
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
  const body = parsed.data;

  try {
    const contact = await db.$transaction(async (tx) => {
      const before = await tx.waContact.findUniqueOrThrow({
        where: { id },
        select: { needsFollowUp: true, followUpAt: true, followUpNote: true, leadId: true },
      });
      if (!before.needsFollowUp) {
        throw new Error("NOT_FOLLOW_UP");
      }

      if (body.action === "done") {
        const updated = await tx.waContact.update({
          where: { id },
          data: { needsFollowUp: false, followUpAt: null, followUpHasTime: false, followUpNote: null },
        });
        if (updated.leadId) {
          await tx.leadActivity.create({
            data: {
              leadId: updated.leadId,
              type: "tag_change",
              payload: { tag: "needsFollowUp", value: false, waContactId: id },
            },
          });
          await tx.leadActivity.create({
            data: {
              leadId: updated.leadId,
              type: "follow_up_done",
              payload: {
                waContactId: id,
                note: body.note?.trim() || null,
                task: before.followUpNote,
                dueAt: before.followUpAt?.toISOString() ?? null,
              },
            },
          });
        }
        return updated;
      }

      if (body.action === "snooze") {
        const until = new Date(body.until);
        if (Number.isNaN(until.getTime())) throw new Error("BAD_DATE");
        const updated = await tx.waContact.update({
          where: { id },
          data: { followUpAt: until, followUpHasTime: body.until.includes("T") },
        });
        if (updated.leadId) {
          await tx.leadActivity.create({
            data: {
              leadId: updated.leadId,
              type: "follow_up_snoozed",
              payload: {
                waContactId: id,
                from: before.followUpAt?.toISOString() ?? null,
                to: until.toISOString(),
              },
            },
          });
        }
        return updated;
      }

      // action === "note"
      return tx.waContact.update({
        where: { id },
        data: { followUpNote: body.note.trim() || null },
      });
    });
    return NextResponse.json({ contact });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "NOT_FOLLOW_UP") {
      return NextResponse.json({ error: "This contact has no active follow-up" }, { status: 409 });
    }
    if (msg === "BAD_DATE") {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
}
