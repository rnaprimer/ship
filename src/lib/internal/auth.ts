import "server-only";
import { MAX_SKEW_SECONDS, SIGNATURE_HEADER, TIMESTAMP_HEADER, signingPayload } from "./contract";
import { hexToBytes } from "../security/crypto";
import { internalSecret } from "../env";

const encoder = new TextEncoder();

/**
 * Verifies an OpenReply → ship request: fresh timestamp and a valid
 * HMAC-SHA256 signature over `${timestamp}.${rawBody}`. Uses WebCrypto
 * `verify`, which compares in constant time. Returns the raw body on success.
 */
export async function verifySignedRequest(
  request: Request,
  now = Date.now(),
): Promise<{ ok: true; rawBody: string } | { ok: false }> {
  const timestamp = request.headers.get(TIMESTAMP_HEADER) ?? "";
  const signature = request.headers.get(SIGNATURE_HEADER) ?? "";
  if (!/^\d{1,12}$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(signature)) return { ok: false };
  if (Math.abs(now / 1000 - Number(timestamp)) > MAX_SKEW_SECONDS) return { ok: false };

  const rawBody = await request.text();
  if (rawBody.length > 4096) return { ok: false };

  const key = await crypto.subtle.importKey(
    "raw",
    internalSecret().slice().buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    hexToBytes(signature).slice().buffer as ArrayBuffer,
    encoder.encode(signingPayload(timestamp, rawBody)),
  );
  return valid ? { ok: true, rawBody } : { ok: false };
}
