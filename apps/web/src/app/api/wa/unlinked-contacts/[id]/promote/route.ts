import { NextRequest, NextResponse } from "next/server";

/** Proxies wa-bridge's POST /unlinked-contacts/:id/promote — see the sibling GET route's doc comment. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bridgeUrl = process.env.WA_BRIDGE_INTERNAL_URL;
  if (!bridgeUrl) {
    return NextResponse.json({ error: "WA_BRIDGE_INTERNAL_URL not configured" }, { status: 500 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const res = await fetch(`${bridgeUrl}/unlinked-contacts/${id}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "wa-bridge unreachable" }, { status: 503 });
  }
}
