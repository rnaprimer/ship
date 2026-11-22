import { DeliveryStatusRequest } from "@/lib/internal/contract";
import { verifySignedRequest } from "@/lib/internal/auth";
import { recordDelivery } from "@/lib/internal/invites";
import { json } from "@/lib/http/request";

/**
 * POST /internal/invites/delivery-status (OpenReply only, HMAC-signed).
 * Records whether the boarding DM was delivered, unconfirmed or failed.
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
  const body = DeliveryStatusRequest.safeParse(parsed);
  if (!body.success) return json({ error: "BAD_REQUEST" }, 400);
  if (!(await recordDelivery(body.data))) return json({ error: "NOT_FOUND" }, 404);
  return json({ ok: true });
}
