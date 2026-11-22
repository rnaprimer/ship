/**
 * Mints test boarding codes through the same issue_invite database function
 * OpenReply will use (Milestone 3), with synthetic Instagram identifiers.
 *
 *   npm run invite:mint                    one code, valid for 7 days
 *   npm run invite:mint -- --count 5
 *   npm run invite:mint -- --expires-in-days 0.01   short-lived code
 *   npm run invite:mint -- --ship test_xyz
 *
 * The codes are printed to this terminal because handing them to the operator
 * is the tool's purpose. They are never logged anywhere else, and only their
 * HMAC (plus an AES-GCM ciphertext until redemption) is stored.
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { formatCode, generateCode, hashCode } from "../src/lib/boarding/code.ts";
import { aesGcmEncryptHex, base64ToBytes } from "../src/lib/security/crypto.ts";

const { values } = parseArgs({
  options: {
    count: { type: "string", default: "1" },
    "expires-in-days": { type: "string", default: "7" },
    ship: { type: "string", default: process.env.SHIP_ID || "main" },
  },
});

const count = Number(values.count);
const days = Number(values["expires-in-days"]);
if (!Number.isInteger(count) || count < 1 || count > 50) throw new Error("--count must be 1..50");
if (!Number.isFinite(days) || days <= 0 || days > 30) throw new Error("--expires-in-days must be in (0, 30]");

const need = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set (run npm run secrets:generate and see .env.example)`);
  return v;
};
const supabase = createClient(need("SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const pepper = base64ToBytes(need("CODE_PEPPER"));
const encryptionKey = base64ToBytes(need("CODE_ENCRYPTION_KEY"));
const expiresAt = new Date(Date.now() + days * 86_400_000);

console.log(`Minting ${count} code(s) for ship "${values.ship}", valid until ${expiresAt.toISOString()}:\n`);
for (let i = 0; i < count; i++) {
  const code = generateCode();
  const id = crypto.randomUUID();
  const { data, error } = await supabase.rpc("issue_invite", {
    p_ship_id: values.ship,
    p_instagram_account_id: "cli",
    p_instagram_user_id: `cli-user-${id}`,
    p_instagram_comment_id: `cli-comment-${id}`,
    p_instagram_media_id: "cli",
    p_code_hash: await hashCode(code, pepper),
    p_code_ciphertext: await aesGcmEncryptHex(encryptionKey, code),
    p_expires_at: expiresAt.toISOString(),
  });
  if (error) throw new Error(`issue_invite failed: ${error.code ?? ""} ${error.message}`);
  if ((data as { status?: string })?.status !== "issued") throw new Error(`Unexpected result: ${(data as { status?: string })?.status}`);
  console.log(`  ${formatCode(code)}`);
}
console.log("\nRedeem at /board. Each code works once.");
