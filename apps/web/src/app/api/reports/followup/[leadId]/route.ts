import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const noteSchema = z.object({
  id: z.string().min(1).max(64),
  text: z.string().max(500),
  done: z.boolean().default(false),
});

const schema = z.object({
  priority: z.enum(["hot", "positive", "warm", "try", "closed"]).optional(),
  action: z.string().max(500).nullable().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  status: z.enum(["open", "done"]).optional(),
  snoozeDays: z.number().int().min(1).max(60).optional(),
  // The whole bullet list is replaced on every save (the page edits it locally).
  notes: z.array(noteSchema).max(50).optional(),
  // /reports/important fields
  importantSection: z.enum(["main", "post_gmeet"]).nullable().optional(),
  importantStage: z.string().max(120).nullable().optional(),
  importantStatus: z.string().max(1000).nullable().optional(),
  noFollowReason: z.string().max(1000).nullable().optional(),
});

const wibDate = (d: Date) => d.toLocaleDateString("sv", { timeZone: "Asia/Jakarta" });

type StoredNote = {
  id: string;
  text: string;
  done: boolean;
  createdAt: string | null;
  doneAt: string | null;
};
interface LogRow {
  leadId: string;
  noteId: string;
  action: "added" | "done" | "undone" | "edited" | "deleted";
  text: string;
}

/**
 * The client always sends the whole list; compare it with what is stored to stamp
 * createdAt/doneAt (server clock, so the page can't fake them) and to build the change log.
 */
function diffNotes(leadId: string, prev: StoredNote[], next: { id: string; text: string; done: boolean }[], nowIso: string) {
  const prevBy = new Map(prev.map((n) => [n.id, n]));
  const logs: LogRow[] = [];
  const merged: StoredNote[] = next.map((n) => {
    const old = prevBy.get(n.id);
    if (!old) {
      logs.push({ leadId, noteId: n.id, action: "added", text: n.text });
      if (n.done) logs.push({ leadId, noteId: n.id, action: "done", text: n.text });
      return { ...n, createdAt: nowIso, doneAt: n.done ? nowIso : null };
    }
    if (old.text !== n.text) logs.push({ leadId, noteId: n.id, action: "edited", text: n.text });
    if (old.done !== n.done) logs.push({ leadId, noteId: n.id, action: n.done ? "done" : "undone", text: n.text });
    return { ...n, createdAt: old.createdAt ?? null, doneAt: n.done ? (old.done ? (old.doneAt ?? null) : nowIso) : null };
  });
  const kept = new Set(next.map((n) => n.id));
  for (const old of prev) if (!kept.has(old.id)) logs.push({ leadId, noteId: old.id, action: "deleted", text: old.text });
  return { merged, logs };
}

/** Create/update a lead's follow-up triage from /reports/followup or /reports/important (source = "manual"). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  const { priority, status, snoozeDays, notes, ...plain } = parsed.data;

  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { id: true } });
  if (!lead) return NextResponse.json({ error: "Lead tidak ditemukan" }, { status: 404 });

  const data: {
    source: string;
    priority?: string;
    status?: string;
    snoozeUntil?: string | null;
    notes?: StoredNote[];
    action?: string | null;
    dueDate?: string | null;
    importantSection?: string | null;
    importantStage?: string | null;
    importantStatus?: string | null;
    noFollowReason?: string | null;
  } = { source: "manual", ...plain };
  if (priority) data.priority = priority;
  let logs: LogRow[] = [];
  if (notes) {
    const existing = await db.followupTriage.findUnique({ where: { leadId }, select: { notes: true } });
    const prev = Array.isArray(existing?.notes) ? (existing.notes as unknown as StoredNote[]) : [];
    const clean = notes.map((n) => ({ ...n, text: n.text.trim() })).filter((n) => n.text);
    const diff = diffNotes(leadId, prev, clean, new Date().toISOString());
    data.notes = diff.merged;
    logs = diff.logs;
  }
  if (status) {
    data.status = status;
    data.snoozeUntil = null;
  }
  if (snoozeDays) {
    data.status = "snoozed";
    data.snoozeUntil = wibDate(new Date(Date.now() + snoozeDays * 86400000));
  }
  const [row] = await db.$transaction([
    db.followupTriage.upsert({
      where: { leadId },
      update: data,
      create: { leadId, ...data, priority: priority ?? "warm" },
    }),
    db.followupNoteLog.createMany({ data: logs }),
  ]);
  return NextResponse.json({ ok: true, triage: row });
}
