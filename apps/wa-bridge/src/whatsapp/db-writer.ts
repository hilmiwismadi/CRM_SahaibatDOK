import { pool } from "../db.js";

export interface UpsertWaContactInput {
  jid: string;
  phoneNormalized: string | null;
  displayName: string | null;
}

/**
 * Prefers matching by phone_normalized when known — that's the durable
 * identity. The same person can arrive under different JIDs across
 * sessions (e.g. an @lid Linked-Device identity vs. the canonical
 * phoneToJid(phoneNormalized) JID that apps/web's outbound sender always
 * uses), and without this, an inbound reply routed through a different JID
 * than the one an earlier outbound send used would create a brand-new
 * wa_contacts row — a duplicate "conversation" for the same person instead
 * of continuing the existing one. Falls back to upsert-by-jid only when no
 * phone is known yet (unresolved @lid) or no existing row matches it.
 */
export async function upsertWaContact(input: UpsertWaContactInput): Promise<string> {
  if (input.phoneNormalized) {
    const byPhone = await pool.query<{ id: string }>(
      `SELECT "id" FROM "wa_contacts" WHERE "phone_normalized" = $1 LIMIT 1`,
      [input.phoneNormalized],
    );
    if (byPhone.rows[0]) {
      if (input.displayName) {
        await pool.query(
          `UPDATE "wa_contacts" SET "display_name" = COALESCE("display_name", $2) WHERE "id" = $1`,
          [byPhone.rows[0].id, input.displayName],
        );
      }
      return byPhone.rows[0].id;
    }
  }

  const result = await pool.query<{ id: string }>(
    `INSERT INTO "wa_contacts" ("id", "jid", "phone_normalized", "display_name")
     VALUES (gen_random_uuid(), $1, $2, $3)
     ON CONFLICT ("jid") DO UPDATE SET
       "phone_normalized" = COALESCE(EXCLUDED."phone_normalized", "wa_contacts"."phone_normalized"),
       "display_name" = COALESCE(EXCLUDED."display_name", "wa_contacts"."display_name")
     RETURNING "id"`,
    [input.jid, input.phoneNormalized, input.displayName],
  );
  return result.rows[0].id;
}

/**
 * Links a wa_contact to a lead by matching phone_normalized, only if it
 * isn't linked yet. No-op if no lead has that phone number.
 */
export async function linkContactToLead(waContactId: string, phoneNormalized: string): Promise<void> {
  await pool.query(
    `UPDATE "wa_contacts"
     SET "lead_id" = (SELECT "id" FROM "leads" WHERE "phone_normalized" = $1 LIMIT 1),
         "linked_at" = now()
     WHERE "id" = $2
       AND "lead_id" IS NULL
       AND EXISTS (SELECT 1 FROM "leads" WHERE "phone_normalized" = $1)`,
    [phoneNormalized, waContactId],
  );
}

/**
 * Backfills phone_normalized for a wa_contact that was created from an
 * unresolved @lid, once Baileys later learns the mapping. If a different
 * row already carries that phone number (e.g. one created by an outbound
 * send in the meantime), merges into it instead — moves its wa_messages
 * over and drops the now-redundant @lid row — rather than ending up with
 * two rows for the same phone number. Returns the id of whichever row is
 * now canonical for this phone, or null if no such unresolved contact
 * exists at all.
 */
export async function backfillPhoneForLid(lid: string, phoneNormalized: string): Promise<string | null> {
  const lidRow = await pool.query<{ id: string }>(
    `SELECT "id" FROM "wa_contacts" WHERE "jid" = $1 AND "phone_normalized" IS NULL`,
    [lid],
  );
  const lidRowId = lidRow.rows[0]?.id;
  if (!lidRowId) return null;

  const canonical = await pool.query<{ id: string }>(
    `SELECT "id" FROM "wa_contacts" WHERE "phone_normalized" = $1 AND "id" != $2 LIMIT 1`,
    [phoneNormalized, lidRowId],
  );
  if (canonical.rows[0]) {
    const canonicalId = canonical.rows[0].id;
    await pool.query(`UPDATE "wa_messages" SET "wa_contact_id" = $1 WHERE "wa_contact_id" = $2`, [
      canonicalId,
      lidRowId,
    ]);
    await pool.query(`DELETE FROM "wa_contacts" WHERE "id" = $1`, [lidRowId]);
    return canonicalId;
  }

  await pool.query(`UPDATE "wa_contacts" SET "phone_normalized" = $2 WHERE "id" = $1`, [lidRowId, phoneNormalized]);
  return lidRowId;
}

export interface InsertWaMessageInput {
  waContactId: string;
  waMessageId: string;
  direction: "inbound" | "outbound";
  body: string | null;
  messageType?: string;
  rawPayload: unknown;
  sentAt: Date;
}

/** Idempotent on wa_message_id. Returns true if a new row was inserted. */
export async function insertWaMessage(input: InsertWaMessageInput): Promise<boolean> {
  const result = await pool.query(
    `INSERT INTO "wa_messages"
       ("id", "wa_contact_id", "wa_message_id", "direction", "body", "message_type", "raw_payload", "sent_at")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6::jsonb, $7)
     ON CONFLICT ("wa_message_id") DO NOTHING`,
    [
      input.waContactId,
      input.waMessageId,
      input.direction,
      input.body,
      input.messageType ?? "text",
      JSON.stringify(input.rawPayload ?? null),
      // `sent_at` is a `timestamp` column (no time zone). node-postgres
      // serializes a raw JS Date using the process's LOCAL time-of-day
      // components, which silently stored WIB wall-clock digits here while
      // Prisma (used everywhere else this column is written/read, e.g.
      // apps/web's outbound sends) always treats these columns as UTC —
      // producing a ~7-hour-ahead timestamp for every inbound message.
      // Passing an explicit UTC ISO string sidesteps node-postgres's Date
      // serialization entirely and keeps both write paths consistent.
      input.sentAt.toISOString(),
    ],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getLeadIdForWaContact(waContactId: string): Promise<string | null> {
  const result = await pool.query<{ lead_id: string | null }>(
    `SELECT "lead_id" FROM "wa_contacts" WHERE "id" = $1`,
    [waContactId],
  );
  return result.rows[0]?.lead_id ?? null;
}

/** All distinct known phone numbers across every lead — the resync candidate set. */
export async function getAllLeadPhoneNumbers(): Promise<string[]> {
  const result = await pool.query<{ phone_normalized: string }>(
    `SELECT DISTINCT "phone_normalized" FROM "leads" WHERE "phone_normalized" IS NOT NULL`,
  );
  return result.rows.map((r) => r.phone_normalized);
}

/**
 * Auto-advances a lead from "contacted" to "responded" on their first-ever
 * inbound reply — mirrors the existing "new"->"contacted" rule in
 * apps/web/src/lib/waSend.ts (fires on the first outbound message), just
 * for the inbound direction. Guarded two ways: only fires when this is
 * genuinely the first inbound message ever recorded for this wa_contact
 * (so a second reply doesn't re-trigger it), and only when the lead is
 * currently exactly "contacted" (so it never overrides a rep who already
 * manually moved the lead further along, or already responded once
 * before). See Context/SahaibatExplanation/6.ReportsDashboardPlan.md §5.1.
 */
export async function maybeAdvanceToResponded(leadId: string, waContactId: string): Promise<void> {
  const inboundCount = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM "wa_messages" WHERE "wa_contact_id" = $1 AND "direction" = 'inbound'`,
    [waContactId],
  );
  if (Number(inboundCount.rows[0]?.count ?? 0) !== 1) return; // not the first inbound message

  const lead = await pool.query<{ pipeline_stage: string }>(
    `SELECT "pipeline_stage" FROM "leads" WHERE "id" = $1`,
    [leadId],
  );
  if (lead.rows[0]?.pipeline_stage !== "contacted") return;

  await pool.query(`UPDATE "leads" SET "pipeline_stage" = 'responded' WHERE "id" = $1`, [leadId]);
  await insertLeadActivity(leadId, "stage_change", { from: "contacted", to: "responded" });
}

export async function insertLeadActivity(
  leadId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await pool.query(
    `INSERT INTO "lead_activities" ("id", "lead_id", "type", "payload")
     VALUES (gen_random_uuid(), $1, $2, $3::jsonb)`,
    [leadId, type, JSON.stringify(payload)],
  );
}
