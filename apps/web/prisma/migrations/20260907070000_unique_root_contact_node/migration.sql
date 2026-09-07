-- CreateIndex (partial unique — not expressible in schema.prisma, added by
-- hand, same pattern as the geom GiST index in the init migration).
-- Prevents the race condition where two concurrent requests both find "no
-- root contact node yet" for a lead and both create one — e.g. a lead's
-- first-ever page load firing GET /messages and GET /contacts in parallel,
-- each independently calling ensureRootContactNode(). Without this, the two
-- root rows return non-deterministically from unordered lookups, so a
-- lead's chat can appear empty depending on which duplicate happens to be
-- picked, even after a message was actually sent and linked to the other one.
CREATE UNIQUE INDEX "lead_contact_nodes_one_root_per_lead"
  ON "lead_contact_nodes" ("lead_id")
  WHERE "is_root" = true;
