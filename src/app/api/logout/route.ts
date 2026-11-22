import { clearSessionCookies, readSessionToken, sessionTokenHash } from "@/lib/auth/session";
import { revokeSession } from "@/lib/db/rpc";
import { isSameOrigin, json } from "@/lib/http/request";

/** POST /api/logout: revokes this browser's session server-side and clears the cookie. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "FORBIDDEN" }, 403);
  const token = readSessionToken(request);
  if (token) await revokeSession(await sessionTokenHash(token));
  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const c of clearSessionCookies(request)) headers.append("Set-Cookie", c);
  return new Response(null, { status: 204, headers });
}
