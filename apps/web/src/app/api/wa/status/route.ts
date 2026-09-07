import { NextResponse } from "next/server";

/**
 * Proxies wa-bridge's /status through the web app. The browser can't reach
 * wa-bridge directly in production (its port is deliberately unpublished —
 * see docker-compose.yml) even though it happens to work in local dev where
 * both run on localhost.
 */
export async function GET() {
  const bridgeUrl = process.env.WA_BRIDGE_INTERNAL_URL;
  if (!bridgeUrl) {
    return NextResponse.json({ connected: false, hasQr: false, error: "WA_BRIDGE_INTERNAL_URL not configured" });
  }
  try {
    const res = await fetch(`${bridgeUrl}/status`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ connected: false, hasQr: false, error: "wa-bridge unreachable" });
  }
}
