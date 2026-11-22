import "server-only";
import { bytesToBase64Url, randomBytes, sha256Hex } from "../security/crypto";
import { isHttps } from "../http/request";

/**
 * Player sessions: 32 random bytes in an HttpOnly cookie; only SHA-256 of
 * the token is stored. 30-day expiry with rolling renewal (at most once a
 * day). Over HTTPS the cookie is Secure with the __Host- prefix; plain HTTP
 * (localhost, LAN phone testing) uses an unprefixed, non-Secure cookie.
 */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_RENEW_AFTER_MS = 24 * 60 * 60 * 1000;
const SECURE_NAME = "__Host-ship_session";
const PLAIN_NAME = "ship_session";

export function newSessionToken(): string {
  return bytesToBase64Url(randomBytes(32));
}

export function sessionTokenHash(token: string): Promise<string> {
  return sha256Hex(token);
}

export function sessionExpiry(now = Date.now()): Date {
  return new Date(now + SESSION_TTL_MS);
}

/** Renew when fewer than (TTL − 1 day) remain, i.e. the session was last renewed over a day ago. */
export function renewBefore(now = Date.now()): Date {
  return new Date(now + SESSION_TTL_MS - SESSION_RENEW_AFTER_MS);
}

function parseCookies(header: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!header) return map;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    map.set(part.slice(0, i).trim(), part.slice(i + 1).trim());
  }
  return map;
}

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/** The session token from the request cookies, if present and well-formed. */
export function readSessionToken(request: Request): string | null {
  const cookies = parseCookies(request.headers.get("cookie"));
  const token = (isHttps(request) ? cookies.get(SECURE_NAME) : null) ?? cookies.get(PLAIN_NAME) ?? null;
  return token && TOKEN_RE.test(token) ? token : null;
}

export function sessionCookie(request: Request, token: string, expires: Date): string {
  const secure = isHttps(request);
  const name = secure ? SECURE_NAME : PLAIN_NAME;
  const maxAge = Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000));
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export function clearSessionCookies(request: Request): string[] {
  const out = [`${PLAIN_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`];
  if (isHttps(request)) out.push(`${SECURE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`);
  return out;
}
