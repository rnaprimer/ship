import { z } from "zod";
import { redeemCode } from "@/lib/boarding/service";
import { boardingErrorResponse } from "@/lib/boarding/responses";
import { ipKey, isSameOrigin, json, readJson } from "@/lib/http/request";
import { sessionCookie } from "@/lib/auth/session";
import { secrets } from "@/lib/env";
import { CHARACTER_VARIANT_COUNT } from "@/game/types";

const Body = z
  .object({
    code: z.string().max(64),
    username: z.string().max(40),
    characterVariant: z.number().int().min(0).max(CHARACTER_VARIANT_COUNT - 1),
  })
  .strict();

/** POST /api/boarding/redeem: consume the code, create the player, start a session. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "FORBIDDEN" }, 403);
  const body = Body.safeParse(await readJson(request));
  if (!body.success) return json({ error: "BAD_REQUEST" }, 400);

  const result = await redeemCode(body.data, await ipKey(request, secrets().pepper));
  if (!result.ok) return boardingErrorResponse(result.error, result.message);

  return json({ player: result.player }, 201, {
    "Set-Cookie": sessionCookie(request, result.sessionToken, result.sessionExpires),
  });
}
