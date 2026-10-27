import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { classifyLead } from "@/lib/leadSegmentation";
import { getNoReplyAfterPitchContactIds } from "@/lib/noReplyAfterPitch";
import { getNonResponsiveContactIds } from "@/lib/nonResponsive";

interface Stat {
  lead_id: string;
  n_in: number;
  n_out: number;
  last_in: Date | null;
  last_out: Date | null;
}
interface PitchRow {
  lead_id: string;
  last_pitch: Date;
  replies_after: number;
}
interface LastBody {
  lead_id: string;
  body: string | null;
  message_type: string | null;
}

/**
 * Work-list for /reports/classify: the leads classifyLead() puts in "active"
 * (Perlu Diklasifikasi) — same query shape as /api/reports/segmentation so the
 * count matches /reports/overview — plus the few facts a rep needs to triage
 * each one quickly (who spoke last, what the lead last said, how long ago).
 * The full chat is fetched lazily per lead from /api/leads/[id]/messages.
 */
export async function GET() {
  const [leads, noReplyAfterPitchIds, nonResponsiveIds] = await Promise.all([
    db.lead.findMany({
      select: {
        id: true,
        name: true,
        phoneNormalized: true,
        pipelineStage: true,
        pipelineStageDef: { select: { label: true, color: true } },
        waContacts: {
          select: {
            id: true,
            noWaAccount: true,
            appointment: true,
            declined: true,
            needsOtherContact: true,
            needsFollowUp: true,
            letterSent: true,
            repliedOverrideAt: true,
            repliedOverrideKind: true,
            messages: { orderBy: { sentAt: "desc" }, take: 1, select: { direction: true, sentAt: true } },
          },
        },
      },
    }),
    getNoReplyAfterPitchContactIds(),
    getNonResponsiveContactIds(),
  ]);

  const active = leads.filter(
    (l) =>
      classifyLead({
        pipelineStage: l.pipelineStage,
        contacts: l.waContacts.map((c) => ({
          noWaAccount: c.noWaAccount,
          appointment: c.appointment,
          declined: c.declined,
          needsOtherContact: c.needsOtherContact,
          needsFollowUp: c.needsFollowUp,
          letterSent: c.letterSent,
          repliedOverrideAt: c.repliedOverrideAt,
          repliedOverrideKind: c.repliedOverrideKind,
          lastMessage: c.messages[0] ?? null,
          noReplyAfterPitch: noReplyAfterPitchIds.has(c.id),
          nonResponsive: nonResponsiveIds.has(c.id),
        })),
      }) === "active",
  );
  const activeIds = active.map((l) => l.id);
  if (activeIds.length === 0) return NextResponse.json({ total: 0, items: [] });

  const [stats, lastIn, lastAny, pitches] = await Promise.all([
    db.$queryRaw<Stat[]>`
      SELECT c.lead_id,
             count(*) FILTER (WHERE m.direction = 'inbound')::int  AS n_in,
             count(*) FILTER (WHERE m.direction = 'outbound')::int AS n_out,
             max(m.sent_at) FILTER (WHERE m.direction = 'inbound')  AS last_in,
             max(m.sent_at) FILTER (WHERE m.direction = 'outbound') AS last_out
        FROM wa_messages m JOIN wa_contacts c ON c.id = m.wa_contact_id
       WHERE c.lead_id = ANY(${activeIds}::uuid[])
       GROUP BY c.lead_id`,
    db.$queryRaw<LastBody[]>`
      SELECT DISTINCT ON (c.lead_id) c.lead_id, left(m.body, 220) AS body, m.message_type
        FROM wa_messages m JOIN wa_contacts c ON c.id = m.wa_contact_id
       WHERE c.lead_id = ANY(${activeIds}::uuid[]) AND m.direction = 'inbound'
       ORDER BY c.lead_id, m.sent_at DESC`,
    db.$queryRaw<LastBody[]>`
      SELECT DISTINCT ON (c.lead_id) c.lead_id, left(m.body, 220) AS body, m.message_type
        FROM wa_messages m JOIN wa_contacts c ON c.id = m.wa_contact_id
       WHERE c.lead_id = ANY(${activeIds}::uuid[]) AND m.direction = 'outbound'
       ORDER BY c.lead_id, m.sent_at DESC`,
    // The intro/pitch message ("Perkenalkan saya Dzaki Wismadi …"): when the
    // latest one went out and how many inbound messages arrived after it.
    db.$queryRaw<PitchRow[]>`
      SELECT c.lead_id,
             max(m.sent_at) AS last_pitch,
             (SELECT count(*)::int FROM wa_messages i JOIN wa_contacts ic ON ic.id = i.wa_contact_id
               WHERE ic.lead_id = c.lead_id AND i.direction = 'inbound'
                 AND i.sent_at > max(m.sent_at)) AS replies_after
        FROM wa_messages m JOIN wa_contacts c ON c.id = m.wa_contact_id
       WHERE c.lead_id = ANY(${activeIds}::uuid[]) AND m.direction = 'outbound'
         AND m.body ILIKE '%perkenalkan saya dzaki wismadi%'
       GROUP BY c.lead_id`,
  ]);
  const pitchBy = new Map(pitches.map((p) => [p.lead_id, p]));
  const statBy = new Map(stats.map((s) => [s.lead_id, s]));
  const lastInBy = new Map(lastIn.map((s) => [s.lead_id, s]));
  const lastOutBy = new Map(lastAny.map((s) => [s.lead_id, s]));

  const items = active.map((l) => {
    const s = statBy.get(l.id);
    // wa_messages.sent_at is a timestamp WITHOUT zone that holds UTC.
    const iso = (d: Date | null | undefined) => (d ? new Date(d.getTime()).toISOString() : null);
    const lastInAt = iso(s?.last_in);
    const lastOutAt = iso(s?.last_out);
    const lastAt = [lastInAt, lastOutAt].filter(Boolean).sort().pop() ?? null;
    const nIn = s?.n_in ?? 0;
    const nOut = s?.n_out ?? 0;
    const marked = l.waContacts.some((c) => c.repliedOverrideAt);
    const pattern =
      nIn === 0 && nOut === 0
        ? "no_messages"
        : nIn === 0
          ? "out_only"
          : lastOutAt && lastInAt && lastOutAt > lastInAt
            ? "we_last"
            : "they_last_marked";
    const pitch = pitchBy.get(l.id);
    const pitchStatus = !pitch ? "not_pitched" : pitch.replies_after > 0 ? "answering" : "no_answer";
    return {
      id: l.id,
      name: l.name,
      phone: l.phoneNormalized,
      stage: l.pipelineStageDef.label,
      stageColor: l.pipelineStageDef.color,
      nIn,
      nOut,
      lastInAt,
      lastOutAt,
      lastAt,
      lastInBody: lastInBy.get(l.id)?.body ?? (lastInBy.get(l.id) ? `[${lastInBy.get(l.id)?.message_type ?? "media"}]` : null),
      lastOutBody: lastOutBy.get(l.id)?.body ?? (lastOutBy.get(l.id) ? `[${lastOutBy.get(l.id)?.message_type ?? "media"}]` : null),
      pattern,
      marked,
      pitchStatus,
      lastPitchAt: pitch ? pitch.last_pitch.toISOString() : null,
      repliesAfterPitch: pitch?.replies_after ?? 0,
    };
  });

  items.sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""));
  return NextResponse.json({ total: items.length, items });
}
