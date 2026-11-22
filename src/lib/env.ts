import "server-only";
import { z } from "zod";

/**
 * Server-side environment, validated once on first use. Never import this
 * from client components: `server-only` makes that a build error.
 */
const serverEnvSchema = z.object({
  SUPABASE_URL: z.url().refine((u) => u.startsWith("https://") || u.startsWith("http://127.0.0.1"), {
    message: "SUPABASE_URL must be https (or a local Supabase at http://127.0.0.1)",
  }),
  /** A secret key (sb_secret_...) or the legacy service_role key. Bypasses RLS: server only. */
  SUPABASE_SECRET_KEY: z.string().min(20, "SUPABASE_SECRET_KEY is missing or too short"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
  if (!parsed.success) {
    // Report which variables are wrong, never their values.
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid server environment: ${problems}. See .env.example.`);
  }
  cached = parsed.data;
  return cached;
}
