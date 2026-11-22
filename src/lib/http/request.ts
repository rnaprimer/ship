import "server-only";
import { hmacSha256Hex } from "../security/crypto";

/**
 * True when a state-changing request comes from our own pages. Browsers
 * always send Origin on POST (fetch, forms and sendBeacon), so a missing
 * Origin is rejected too.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  return originHost === host;
}

/** Whether the client reached us over HTTPS (directly or via a proxy such as Cloudflare). */
export function isHttps(request: Request): boolean {
  const proto = request.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  return new URL(request.url).protocol === "https:";
}

/**
 * The client's IP, read only from a header the hosting platform sets itself.
 * Clients can send any header they like, so trusting the wrong one would let
 * an attacker rotate fake IPs past the rate limits.
 *   - CLIENT_IP_HEADER set: that header (e.g. "cf-connecting-ip" behind Cloudflare).
 *   - On Vercel: "x-real-ip", which Vercel overwrites with the real client IP.
 *   - Otherwise (local dev, tests): the first hop of x-forwarded-for.
 */
function clientIp(request: Request): string {
  const configured = process.env.CLIENT_IP_HEADER?.trim().toLowerCase();
  if (configured) return request.headers.get(configured)?.split(",")[0].trim() || "unknown";
  if (process.env.VERCEL) return request.headers.get("x-real-ip")?.trim() || "unknown";
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

/** Rate-limit key for the caller's IP: HMAC'd so raw IPs are never stored. */
export async function ipKey(request: Request, pepper: Uint8Array): Promise<string> {
  return (await hmacSha256Hex(pepper, `ip:v1:${clientIp(request)}`)).slice(0, 32);
}

export const NO_STORE = { "Cache-Control": "no-store" } as const;

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

/** Parses a JSON body, returning undefined for missing/invalid JSON or oversized bodies. */
export async function readJson(request: Request, maxBytes = 4096): Promise<unknown> {
  const text = await request.text();
  if (text.length > maxBytes) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
