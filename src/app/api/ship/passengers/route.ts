import { authenticate, lookOf } from "@/lib/player/service";
import { samplePassengers } from "@/lib/db/rpc";
import { json } from "@/lib/http/request";
import { serverEnv } from "@/lib/env";

/**
 * GET /api/ship/passengers: up to 15 random passengers, username and look
 * only. Never Instagram data, ids or online status. Excludes the caller.
 */
export async function GET(request: Request) {
  const me = await authenticate(request);
  const rows = await samplePassengers(serverEnv().SHIP_ID, me?.player_id ?? null, 15);
  return json({
    passengers: rows.map((r) => ({ username: r.username, ...lookOf(r) })),
  });
}
