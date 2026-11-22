import { IssueRequest } from "@/lib/internal/contract";
import { verifySignedRequest } from "@/lib/internal/auth";
import { issueForComment } from "@/lib/internal/invites";
import { json } from "@/lib/http/request";

/**
 * POST /internal/invites/issue (OpenReply only, HMAC-signed).
 * Returns the boarding code to DM for a comment. Idempotent on the comment ID.
 */
export async function POST(request: Request) {
  const auth = await verifySignedRequest(request);
  if (!auth.ok) return json({ error: "UNAUTHORIZED" }, 401);
  let parsed: unknown;
  try {
    parsed = JSON.parse(auth.rawBody);
  } catch {
    return json({ error: "BAD_REQUEST" }, 400);
  }
  const body = IssueRequest.safeParse(parsed);
  if (!body.success) return json({ error: "BAD_REQUEST" }, 400);
  return json(await issueForComment(body.data));
}
