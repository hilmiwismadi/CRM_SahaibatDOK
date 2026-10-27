import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE_S, checkCredentials, createSessionToken } from "@/lib/auth";

// Naive in-memory throttle: 5 wrong attempts from one IP -> locked for a minute.
const MAX_FAILS = 5;
const LOCK_MS = 60_000;
const fails = new Map<string, { count: number; until: number }>();

function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: Request) {
  const key = clientKey(req);
  const state = fails.get(key);
  if (state && state.until > Date.now()) {
    const wait = Math.ceil((state.until - Date.now()) / 1000);
    return NextResponse.json({ error: `Terlalu banyak percobaan. Coba lagi ${wait} detik lagi.` }, { status: 429 });
  }

  let email = "";
  let password = "";
  try {
    const body = await req.json();
    email = typeof body.email === "string" ? body.email : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  if (!(await checkCredentials(email, password))) {
    const count = (state?.count ?? 0) + 1;
    fails.set(key, count >= MAX_FAILS ? { count: 0, until: Date.now() + LOCK_MS } : { count, until: 0 });
    return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  }

  fails.delete(key);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
    // The VPS serves plain http:// - a Secure cookie would never be sent back.
    secure: false,
  });
  return res;
}
