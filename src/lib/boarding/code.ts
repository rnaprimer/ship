import { hmacSha256Hex, randomBytes } from "../security/crypto.ts";

/**
 * Boarding codes: 16 symbols from Crockford base32 (no I, L, O, U) = 80 bits,
 * shown as K7PM-4XQ2-B9RT-6NWA. Pure module (no server-only import) so the
 * mint CLI can use it too.
 */
export const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CODE_LENGTH = 16;
const CODE_RE = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

/** Uniform random code via rejection sampling (never modulo bias). */
export function generateCode(): string {
  const limit = 256 - (256 % CODE_ALPHABET.length); // 256 for a 32-symbol alphabet: no rejections, but stays correct if it changes
  let out = "";
  while (out.length < CODE_LENGTH) {
    for (const b of randomBytes(CODE_LENGTH * 2)) {
      if (b >= limit) continue;
      out += CODE_ALPHABET[b % CODE_ALPHABET.length];
      if (out.length === CODE_LENGTH) break;
    }
  }
  return out;
}

export function formatCode(code: string): string {
  return code.match(/.{1,4}/g)!.join("-");
}

/**
 * Accepts what people actually type: any case, spaces and hyphens, and the
 * look-alikes O→0, I/L→1. Returns the canonical 16 symbols, or null if the
 * input cannot be a code (checked without touching the database).
 */
export function normalizeCode(input: string): string | null {
  if (typeof input !== "string" || input.length > 64) return null;
  const s = input
    .toUpperCase()
    .replace(/[\s-]+/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  return CODE_RE.test(s) ? s : null;
}

/** HMAC-SHA256(pepper, normalized code) as hex: the only form stored in the database. */
export function hashCode(normalized: string, pepper: Uint8Array): Promise<string> {
  return hmacSha256Hex(pepper, `boarding-code:v1:${normalized}`);
}
