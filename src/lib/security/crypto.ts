/**
 * Small WebCrypto helpers. WebCrypto (not node:crypto) so the same code runs
 * in Node, Cloudflare Workers and the mint CLI. No secrets are logged here.
 */

const subtle = globalThis.crypto.subtle;
const encoder = new TextEncoder();

export function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  globalThis.crypto.getRandomValues(out);
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) throw new Error("Invalid hex");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const toBuffer = (b: Uint8Array): ArrayBuffer => b.slice().buffer as ArrayBuffer;

export async function hmacSha256Hex(key: Uint8Array, message: string): Promise<string> {
  const k = await subtle.importKey("raw", toBuffer(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToHex(new Uint8Array(await subtle.sign("HMAC", k, encoder.encode(message))));
}

export async function sha256Hex(message: string): Promise<string> {
  return bytesToHex(new Uint8Array(await subtle.digest("SHA-256", encoder.encode(message))));
}

/** AES-256-GCM. Output: hex(iv[12] || ciphertext+tag). */
export async function aesGcmEncryptHex(key: Uint8Array, plaintext: string): Promise<string> {
  if (key.length !== 32) throw new Error("AES key must be 32 bytes");
  const k = await subtle.importKey("raw", toBuffer(key), "AES-GCM", false, ["encrypt"]);
  const iv = randomBytes(12);
  const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv: toBuffer(iv) }, k, encoder.encode(plaintext)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return bytesToHex(out);
}

export async function aesGcmDecryptHex(key: Uint8Array, hex: string): Promise<string> {
  const data = hexToBytes(hex);
  const k = await subtle.importKey("raw", toBuffer(key), "AES-GCM", false, ["decrypt"]);
  const pt = await subtle.decrypt({ name: "AES-GCM", iv: toBuffer(data.slice(0, 12)) }, k, toBuffer(data.slice(12)));
  return new TextDecoder().decode(pt);
}
