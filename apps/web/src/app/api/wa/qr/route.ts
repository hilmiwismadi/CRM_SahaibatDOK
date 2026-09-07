import { NextRequest, NextResponse } from "next/server";

/** Proxies wa-bridge's /qr through the web app — same reachability reason as api/wa/status. */
export async function GET(req: NextRequest) {
  const bridgeUrl = process.env.WA_BRIDGE_INTERNAL_URL;
  if (!bridgeUrl) {
    return NextResponse.json({ error: "WA_BRIDGE_INTERNAL_URL not configured" }, { status: 500 });
  }

  const format = new URL(req.url).searchParams.get("format");
  const target = `${bridgeUrl}/qr${format ? `?format=${format}` : ""}`;

  try {
    const res = await fetch(target, { cache: "no-store" });
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, { status: res.status, headers: { "content-type": contentType } });
  } catch {
    return NextResponse.json({ error: "wa-bridge unreachable" }, { status: 503 });
  }
}
