import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const BOOLEAN_ACTIONS = ["noWaAccount", "appointment", "needsOtherContact", "needsFollowUp"] as const;
const schema = z.object({ action: z.enum([...BOOLEAN_ACTIONS, "repliedBot", "clear"]) });

/**
 * Lead-level equivalent of /api/conversations/[id]/flag and /replied —
 * used by /reports/kanban's drag-and-drop and "Pindahkan ke" popup action,
 * where all we have is a leadId (Kanban cards are per-lead, not
 * per-conversation). Resolves the lead's "primary" contact (most recently
 * messaged, or its only contact) and applies the same tag/reply-override
 * change + lead_activities logging those routes already do, so
 * /reports/kanban-history's per-date counts stay accurate regardless of
 * which UI path made the change.
 *
 * A lead with zero wa_contacts (still "Belum Disentuh") has nothing to tag
 * — there's no conversation row to hold the flags — so this 400s rather
 * than silently no-op-ing; the frontend surfaces that as a rejected drop.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const contacts = await db.waContact.findMany({
    where: { leadId },
    select: {
      id: true,
      noWaAccount: true,
      appointment: true,
      needsOtherContact: true,
      needsFollowUp: true,
      repliedOverrideAt: true,
      messages: { orderBy: { sentAt: "desc" }, take: 1, select: { sentAt: true } },
    },
  });

  if (contacts.length === 0) {
    return NextResponse.json(
      { error: "Lead ini belum punya percakapan WA — mulai chat dulu sebelum bisa ditandai." },
      { status: 400 },
    );
  }

  const { action } = parsed.data;

  if (action === "clear") {
    await db.$transaction(async (tx) => {
      for (const c of contacts) {
        const tagChanges = (
          [
            { tag: "noWaAccount", was: c.noWaAccount },
            { tag: "appointment", was: c.appointment },
            { tag: "needsOtherContact", was: c.needsOtherContact },
            { tag: "needsFollowUp", was: c.needsFollowUp },
          ] as const
        ).filter((t) => t.was);
        if (tagChanges.length === 0 && !c.repliedOverrideAt) continue;

        await tx.waContact.update({
          where: { id: c.id },
          data: {
            noWaAccount: false,
            appointment: false,
            needsOtherContact: false,
            needsFollowUp: false,
            repliedOverrideAt: null,
            repliedOverrideKind: null,
          },
        });
        for (const t of tagChanges) {
          await tx.leadActivity.create({
            data: { leadId, type: "tag_change", payload: { tag: t.tag, value: false, waContactId: c.id } },
          });
        }
        if (c.repliedOverrideAt) {
          await tx.leadActivity.create({
            data: { leadId, type: "replied_marked", payload: { cleared: true, waContactId: c.id } },
          });
        }
      }
    });
    return NextResponse.json({ ok: true });
  }

  const primary = [...contacts].sort((a, b) => {
    const at = a.messages[0]?.sentAt.getTime() ?? 0;
    const bt = b.messages[0]?.sentAt.getTime() ?? 0;
    return bt - at;
  })[0];

  if (action === "repliedBot") {
    await db.$transaction(async (tx) => {
      await tx.waContact.update({
        where: { id: primary.id },
        data: { repliedOverrideAt: new Date(), repliedOverrideKind: "bot" },
      });
      await tx.leadActivity.create({
        data: { leadId, type: "replied_marked", payload: { kind: "bot", waContactId: primary.id } },
      });
    });
    return NextResponse.json({ ok: true });
  }

  if (primary[action]) return NextResponse.json({ ok: true }); // already set
  await db.$transaction(async (tx) => {
    await tx.waContact.update({ where: { id: primary.id }, data: { [action]: true } });
    await tx.leadActivity.create({
      data: { leadId, type: "tag_change", payload: { tag: action, value: true, waContactId: primary.id } },
    });
  });
  return NextResponse.json({ ok: true });
}
