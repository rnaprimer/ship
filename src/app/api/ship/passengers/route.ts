import { authenticate, lookOf } from "@/lib/player/service";
import { samplePassengers } from "@/lib/db/rpc";
import { json } from "@/lib/http/request";
import { serverEnv } from "@/lib/env";

/**
 * GET /api/ship/passengers: up to 15 passengers, recently active ones first:
 * username, look, and whether they have been aboard in the last 10 minutes
 * (owner decision 2026-11-28). Never Instagram data or ids. Excludes the caller.
 */
export async function GET(request: Request) {
  const me = await authenticate(request);
  const rows = await samplePassengers(serverEnv().SHIP_ID, me?.player_id ?? null, 15);
  return json({
    passengers: rows.map((r) => ({ username: r.username, ...lookOf(r), active: r.active })),
  });
}
