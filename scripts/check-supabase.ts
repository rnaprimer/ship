/**
 * Checks that .env.local points at a reachable Supabase project and that the
 * secret key is accepted. Prints only status, never the key.
 *
 *   npm run db:check
 */
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local (see .env.example).");
  process.exit(1);
}

// Listing auth users needs a secret/service-role key; a publishable key gets 401/403.
const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/admin/users?per_page=1`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
  signal: AbortSignal.timeout(10_000),
});

if (res.ok) {
  console.log(`Connected to ${new URL(url).host}: secret key accepted (HTTP ${res.status}).`);
} else {
  console.error(`Supabase rejected the request: HTTP ${res.status}. Check that SUPABASE_SECRET_KEY is the secret (not publishable) key.`);
  process.exit(1);
}

export {};
