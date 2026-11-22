import { authenticate, PositionBody, savePlayerPosition } from "@/lib/player/service";
import { isSameOrigin, json, readJson } from "@/lib/http/request";

const STATUS = { WRONG_MAP: 409, NOT_WALKABLE: 422, TOO_FAST: 422, TOO_SOON: 429 } as const;

/**
 * POST /api/me/position: saves the signed-in player's own position. The
 * player comes only from the session; the body cannot name another player.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "FORBIDDEN" }, 403);
  const player = await authenticate(request);
  if (!player) return json({ error: "UNAUTHENTICATED" }, 401);
  const body = PositionBody.safeParse(await readJson(request, 512));
  if (!body.success) return json({ error: "BAD_REQUEST" }, 400);

  const result = await savePlayerPosition(player.player_id, body.data);
  if (!result.ok) return json({ error: result.error }, STATUS[result.error]);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
