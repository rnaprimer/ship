import { authenticate, lookOf, usablePosition } from "@/lib/player/service";
import { json } from "@/lib/http/request";

/** GET /api/me: the signed-in player and their saved position (null = use spawn). */
export async function GET(request: Request) {
  const player = await authenticate(request);
  if (!player) return json({ error: "UNAUTHENTICATED" }, 401);
  return json(
    {
      player: { username: player.username, ...lookOf(player) },
      position: usablePosition(player),
    },
    200,
    player.setCookie ? { "Set-Cookie": player.setCookie } : {},
  );
}
