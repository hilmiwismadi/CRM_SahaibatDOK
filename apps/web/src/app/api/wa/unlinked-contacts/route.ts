import { NextResponse } from "next/server";

/**
 * Proxies wa-bridge's GET /unlinked-contacts — wa_contacts that messaged in
 * but never matched a lead (see apps/wa-bridge/src/whatsapp/db-writer.ts's
 * listUnlinkedContacts doc comment). Mostly the account owner's personal
 * contacts; occasionally a genuine new lead who wrote in first, which the
 * "Jadikan Lead" action (promote route) exists to catch before the
 * retention purge drops it.
 */
export async function GET() {
  const bridgeUrl = process.env.WA_BRIDGE_INTERNAL_URL;
  if (!bridgeUrl) {
    return NextResponse.json({ error: "WA_BRIDGE_INTERNAL_URL not configured" }, { status: 500 });
  }
  try {
    const res = await fetch(`${bridgeUrl}/unlinked-contacts`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "wa-bridge unreachable" }, { status: 503 });
  }
}
