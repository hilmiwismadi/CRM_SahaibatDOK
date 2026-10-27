/**
 * Minimal single-user login for the whole dashboard.
 *
 * Credentials come from AUTH_EMAIL / AUTH_PASSWORD (set them in the web
 * service's environment to change them without touching code); the defaults
 * below are the ones the owner asked for. The session cookie is a signed
 * "<expiresAtMs>.<hmac>" token, so nothing is stored server-side and a server
 * restart does not log anyone out. Web Crypto only -> works in proxy.ts too.
 */

export const SESSION_COOKIE = "sb_session";
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

const DEFAULT_EMAIL = "dzakiwismadi@gmail.com";
const DEFAULT_PASSWORD = "1stjob";

function expectedEmail(): string {
  return (process.env.AUTH_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
}

function expectedPassword(): string {
  return process.env.AUTH_PASSWORD || DEFAULT_PASSWORD;
}

// Signing key derives from the password too, so rotating the password also
// invalidates every existing session.
function signingSecret(): string {
  return process.env.AUTH_SECRET || `sahaibat-session|${expectedEmail()}|${expectedPassword()}`;
}

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(text)));
}

async function hmacHex(message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(signingSecret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkCredentials(email: string, password: string): Promise<boolean> {
  // Hash both sides first so the comparison length never depends on the input.
  const [e1, e2, p1, p2] = await Promise.all([
    sha256Hex(email.trim().toLowerCase()),
    sha256Hex(expectedEmail()),
    sha256Hex(password),
    sha256Hex(expectedPassword()),
  ]);
  const emailOk = safeEqual(e1, e2);
  const passOk = safeEqual(p1, p2);
  return emailOk && passOk;
}

export async function createSessionToken(): Promise<string> {
  const exp = Date.now() + SESSION_MAX_AGE_S * 1000;
  return `${exp}.${await hmacHex(`session|${exp}`)}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const exp = Number(token.slice(0, dot));
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return safeEqual(token.slice(dot + 1), await hmacHex(`session|${exp}`));
}
