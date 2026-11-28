import { authenticate, OutfitBody } from "@/lib/player/service";
import { rateLimitHit, setOutfit } from "@/lib/db/rpc";
import { isSameOrigin, json, readJson } from "@/lib/http/request";

/** Outfit changes per player per minute: plenty for trying things on. */
const LIMIT = { windowSeconds: 60, max: 30 };

/**
 * POST /api/me/outfit: changes the signed-in player's own look (base look,
 * crew role, colour, hat). The player comes only from the session.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "FORBIDDEN" }, 403);
  const player = await authenticate(request);
  if (!player) return json({ error: "UNAUTHENTICATED" }, 401);
  const body = OutfitBody.safeParse(await readJson(request, 256));
  if (!body.success) return json({ error: "BAD_REQUEST" }, 400);
  if (!(await rateLimitHit(`${player.ship_id}:outfit:${player.player_id}`, LIMIT.windowSeconds, LIMIT.max))) {
    return json({ error: "RATE_LIMITED" }, 429);
  }

  const result = await setOutfit({ playerId: player.player_id, ...body.data });
  if (result !== "OK") return json({ error: result === "INVALID" ? "BAD_REQUEST" : "UNAUTHENTICATED" }, result === "INVALID" ? 400 : 401);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
