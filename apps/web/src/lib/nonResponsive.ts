import { db } from "@/lib/db";

/**
 * wa_contact ids matching "Non-Responsive": at least one outbound message
 * sent, zero inbound ever, and the first outbound message went out more
 * than 2 days ago — the "diam dari awal" counterpart to
 * noReplyAfterPitch.ts's "diam setelah pitch" (see the 2026-09-12
 * chat-history review that identified this gap: 4 leads with a single
 * unanswered opener were landing in the uninformative "active" bucket
 * indistinguishable from a healthy new conversation). The 2-day grace
 * window matches the existing "bot reply, then send the pitch after 2
 * days" rule — a contact messaged minutes ago just hasn't had time to
 * reply yet, that's not the same thing.
 */
export async function getNonResponsiveContactIds(): Promise<Set<string>> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    WITH outbound_stats AS (
      SELECT wa_contact_id, MIN(sent_at) AS first_outbound_at
      FROM wa_messages WHERE direction = 'outbound' GROUP BY wa_contact_id
    ),
    has_inbound AS (
      SELECT DISTINCT wa_contact_id FROM wa_messages WHERE direction = 'inbound'
    )
    SELECT o.wa_contact_id AS id
    FROM outbound_stats o
    LEFT JOIN has_inbound i ON i.wa_contact_id = o.wa_contact_id
    WHERE i.wa_contact_id IS NULL
      AND o.first_outbound_at < now() - interval '2 days'
  `;
  return new Set(rows.map((r) => r.id));
}
