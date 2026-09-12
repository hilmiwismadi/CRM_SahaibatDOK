import { db } from "@/lib/db";

/**
 * wa_contact ids matching "Tidak Reply Lagi": a pitch-category template
 * message was sent, the contact had already replied at some point before
 * that pitch (so they were genuinely engaged, not just an unanswered cold
 * open), and nothing has come in since. Matched against message_templates
 * (category = "pitch") rather than hardcoding the pitch copy or the rep's
 * name, so this keeps working if either changes later. See the 2026-09-10
 * chat-history analysis that identified this pattern — leads here were
 * previously landing in the uninformative "active" bucket.
 */
export async function getNoReplyAfterPitchContactIds(): Promise<Set<string>> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    WITH pitch_templates AS (
      SELECT substr(message, 1, 60) AS snippet FROM message_templates WHERE category = 'pitch'
    ),
    pitch AS (
      SELECT m.wa_contact_id, MAX(m.sent_at) AS pitch_sent_at
      FROM wa_messages m
      WHERE m.direction = 'outbound'
        AND EXISTS (SELECT 1 FROM pitch_templates t WHERE m.body ILIKE '%' || t.snippet || '%')
      GROUP BY m.wa_contact_id
    ),
    inbound_stats AS (
      SELECT wa_contact_id, MIN(sent_at) AS first_inbound_at, MAX(sent_at) AS last_inbound_at
      FROM wa_messages WHERE direction = 'inbound' GROUP BY wa_contact_id
    )
    SELECT p.wa_contact_id AS id
    FROM pitch p
    JOIN inbound_stats i ON i.wa_contact_id = p.wa_contact_id
    WHERE i.first_inbound_at < p.pitch_sent_at
      AND (i.last_inbound_at IS NULL OR i.last_inbound_at < p.pitch_sent_at)
  `;
  return new Set(rows.map((r) => r.id));
}
