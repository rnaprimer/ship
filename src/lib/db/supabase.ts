import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "../env";

let client: SupabaseClient | undefined;

/**
 * The only Supabase client in the app. It uses the secret (service-role) key
 * and runs on the server only. RLS stays on for every table with no anon
 * policies (CLAUDE.md), so the browser never talks to Supabase directly.
 * No user sessions here: player sessions are our own HttpOnly cookies.
 */
export function db(): SupabaseClient {
  if (client) return client;
  const env = serverEnv();
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
