/**
 * Helpers for *.db.test.ts: integration tests against the Supabase project in
 * .env.local. Each test file gets its own throwaway ship (test_<random>), so
 * nothing touches the real 'main' ship, and the ship is deleted afterwards
 * (players, invites, sessions and positions cascade).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateCode, formatCode, hashCode } from "@/lib/boarding/code";
import { aesGcmEncryptHex, base64ToBytes, bytesToHex } from "@/lib/security/crypto";

export const hasDb = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY && process.env.CODE_PEPPER && process.env.CODE_ENCRYPTION_KEY,
);

export function admin(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Creates a throwaway ship and points the app at it (SHIP_ID). */
export async function createTestShip(): Promise<string> {
  const id = `test_${bytesToHex(crypto.getRandomValues(new Uint8Array(6)))}`;
  const { error } = await admin().from("ships").insert({ id, name: "Test ship" });
  if (error) throw new Error(`create ship: ${error.message}`);
  process.env.SHIP_ID = id;
  return id;
}

export async function deleteTestShip(id: string): Promise<void> {
  if (!id.startsWith("test_")) throw new Error("refusing to delete a non-test ship");
  const db = admin();
  const { error } = await db.from("ships").delete().eq("id", id);
  if (error) throw new Error(`delete ship: ${error.message}`);
  await db.from("rate_limits").delete().like("key", `${id}:%`);
}

let seq = 0;

/** Issues a code through issue_invite (like the mint CLI) and returns it formatted. */
export async function mintCode(shipId: string, opts: { expiresAt?: Date; user?: string } = {}): Promise<string> {
  const code = generateCode();
  const n = `${Date.now()}-${seq++}-${Math.random().toString(36).slice(2)}`;
  const { data, error } = await admin().rpc("issue_invite", {
    p_ship_id: shipId,
    p_instagram_account_id: "test-account",
    p_instagram_user_id: opts.user ?? `test-user-${n}`,
    p_instagram_comment_id: `test-comment-${n}`,
    p_instagram_media_id: "test-media",
    p_code_hash: await hashCode(code, base64ToBytes(process.env.CODE_PEPPER!)),
    p_code_ciphertext: await aesGcmEncryptHex(base64ToBytes(process.env.CODE_ENCRYPTION_KEY!), code),
    p_expires_at: (opts.expiresAt ?? new Date(Date.now() + 7 * 86_400_000)).toISOString(),
  });
  if (error) throw new Error(`issue_invite: ${error.message}`);
  if (data.status !== "issued") throw new Error(`issue_invite returned ${data.status}`);
  return formatCode(code);
}

const ORIGIN = "http://ship.test";
let ipSeq = 0;

/** A fresh fake client IP, so rate limits from one test don't affect another. */
export function freshIp(): string {
  ipSeq++;
  return `10.${(ipSeq >> 16) & 255}.${(ipSeq >> 8) & 255}.${ipSeq & 255}`;
}

export function req(
  path: string,
  opts: { method?: string; body?: unknown; cookie?: string; origin?: string | null; ip?: string; rawBody?: string } = {},
): Request {
  const headers = new Headers({ host: "ship.test", "x-forwarded-for": opts.ip ?? freshIp() });
  if (opts.origin !== null) headers.set("origin", opts.origin ?? ORIGIN);
  if (opts.cookie) headers.set("cookie", opts.cookie);
  const method = opts.method ?? (opts.body !== undefined || opts.rawBody !== undefined ? "POST" : "GET");
  if (method !== "GET") headers.set("content-type", "application/json");
  return new Request(`${ORIGIN}${path}`, {
    method,
    headers,
    body: method === "GET" ? undefined : (opts.rawBody ?? JSON.stringify(opts.body ?? {})),
  });
}

/** "name=value" from a Set-Cookie header, for sending back as a Cookie header. */
export function cookieFrom(res: Response): string {
  const set = res.headers.get("set-cookie");
  if (!set) throw new Error("no Set-Cookie");
  return set.split(";")[0];
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
