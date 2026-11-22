import "server-only";
import { z } from "zod";
import { base64ToBytes } from "./security/crypto";

/**
 * Server-side environment, validated once on first use. Never import this
 * from client components: `server-only` makes that a build error.
 */
const base64Key = (minBytes: number, exactBytes?: number) =>
  z.string().refine(
    (v) => {
      try {
        const n = base64ToBytes(v).length;
        return exactBytes ? n === exactBytes : n >= minBytes;
      } catch {
        return false;
      }
    },
    { message: exactBytes ? `must be ${exactBytes} bytes, base64` : `must be at least ${minBytes} bytes, base64` },
  );

const serverEnvSchema = z.object({
  SUPABASE_URL: z.url().refine((u) => u.startsWith("https://") || u.startsWith("http://127.0.0.1"), {
    message: "SUPABASE_URL must be https (or a local Supabase at http://127.0.0.1)",
  }),
  /** A secret key (sb_secret_...) or the legacy service_role key. Bypasses RLS: server only. */
  SUPABASE_SECRET_KEY: z.string().min(20, "SUPABASE_SECRET_KEY is missing or too short"),
  /** HMAC key for boarding-code hashes and IP rate-limit keys. Rotating it invalidates unredeemed codes. */
  CODE_PEPPER: base64Key(32),
  /** AES-256-GCM key for the temporarily stored (re-sendable) code ciphertext. */
  CODE_ENCRYPTION_KEY: base64Key(32, 32),
  /** Which ship this deployment serves. Tests use throwaway ships. */
  SHIP_ID: z.string().regex(/^[a-z0-9_-]{1,40}$/).default("main"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (cached && cached.SHIP_ID === (process.env.SHIP_ID ?? "main")) return cached;
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    CODE_PEPPER: process.env.CODE_PEPPER,
    CODE_ENCRYPTION_KEY: process.env.CODE_ENCRYPTION_KEY,
    SHIP_ID: process.env.SHIP_ID || undefined,
  });
  if (!parsed.success) {
    // Report which variables are wrong, never their values.
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid server environment: ${problems}. See .env.example.`);
  }
  cached = parsed.data;
  return cached;
}

export function secrets() {
  const env = serverEnv();
  return {
    pepper: base64ToBytes(env.CODE_PEPPER),
    encryptionKey: base64ToBytes(env.CODE_ENCRYPTION_KEY),
  };
}
