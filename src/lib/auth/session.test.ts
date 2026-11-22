import { describe, expect, it } from "vitest";
import {
  clearSessionCookies,
  newSessionToken,
  readSessionToken,
  renewBefore,
  sessionCookie,
  sessionExpiry,
  sessionTokenHash,
  SESSION_TTL_MS,
} from "./session";

const http = (cookie?: string) =>
  new Request("http://localhost:3000/api/me", { headers: cookie ? { cookie } : {} });
const https = (cookie?: string) =>
  new Request("http://internal/api/me", { headers: { "x-forwarded-proto": "https", ...(cookie ? { cookie } : {}) } });

describe("session tokens", () => {
  it("are 32 random bytes (43 base64url chars), unique, and hashed with SHA-256", async () => {
    const a = newSessionToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newSessionToken()).not.toBe(a);
    const h = await sessionTokenHash(a);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain(a);
  });

  it("expire after 30 days and renew once a day", () => {
    const now = Date.UTC(2026, 0, 1);
    expect(sessionExpiry(now).getTime() - now).toBe(SESSION_TTL_MS);
    expect(sessionExpiry(now).getTime() - renewBefore(now).getTime()).toBe(24 * 3600 * 1000);
  });
});

describe("session cookie", () => {
  const token = newSessionToken();
  const expires = sessionExpiry();

  it("is HttpOnly, SameSite=Lax, Path=/ and has a Max-Age", () => {
    const c = sessionCookie(http(), token, expires);
    expect(c).toMatch(/^ship_session=/);
    expect(c).toContain("HttpOnly");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Path=/");
    expect(c).toMatch(/Max-Age=\d+/);
    expect(c).not.toContain("Secure");
  });

  it("is Secure with the __Host- prefix over HTTPS", () => {
    const c = sessionCookie(https(), token, expires);
    expect(c).toMatch(/^__Host-ship_session=/);
    expect(c).toContain("; Secure");
  });

  it("reads only well-formed tokens", () => {
    expect(readSessionToken(http(`ship_session=${token}`))).toBe(token);
    expect(readSessionToken(https(`__Host-ship_session=${token}`))).toBe(token);
    expect(readSessionToken(http("ship_session=short"))).toBeNull();
    expect(readSessionToken(http(`ship_session=${token}x`))).toBeNull();
    expect(readSessionToken(http("other=1"))).toBeNull();
    expect(readSessionToken(http())).toBeNull();
    // The __Host- cookie is ignored over plain HTTP.
    expect(readSessionToken(http(`__Host-ship_session=${token}`))).toBeNull();
  });

  it("clears both cookie names", () => {
    const cleared = clearSessionCookies(https());
    expect(cleared).toHaveLength(2);
    for (const c of cleared) expect(c).toContain("Max-Age=0");
  });
});
