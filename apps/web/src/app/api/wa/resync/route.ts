import { NextResponse } from "next/server";

/**
 * Proxies wa-bridge's POST /resync-contacts — see
 * apps/wa-bridge/src/whatsapp/resync.ts for what this does and why.
 */
export async function POST() {
  const bridgeUrl = process.env.WA_BRIDGE_INTERNAL_URL;
  if (!bridgeUrl) {
    return NextResponse.json({ ran: false, error: "WA_BRIDGE_INTERNAL_URL not configured" }, { status: 503 });
  }
  try {
    const res = await fetch(`${bridgeUrl}/resync-contacts`, { method: "POST", cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ ran: false, error: "wa-bridge unreachable" }, { status: 503 });
  }
}
