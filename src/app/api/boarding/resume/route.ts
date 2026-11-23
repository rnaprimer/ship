import { z } from "zod";
import { resumeWithBoardingCode } from "@/lib/boarding/service";
import { boardingErrorResponse } from "@/lib/boarding/responses";
import { ipKey, isSameOrigin, json, readJson } from "@/lib/http/request";
import { sessionCookie } from "@/lib/auth/session";
import { secrets } from "@/lib/env";

const Body = z.object({ code: z.string().max(64) }).strict();

/**
 * POST /api/boarding/resume: a player who already boarded signs back in to
 * their character with the same boarding code, on any browser or device.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "FORBIDDEN" }, 403);
  const body = Body.safeParse(await readJson(request));
  if (!body.success) return json({ error: "BAD_REQUEST" }, 400);

  const result = await resumeWithBoardingCode(body.data.code, await ipKey(request, secrets().pepper));
  if (!result.ok) return boardingErrorResponse(result.error, result.message);

  return json({ player: result.player }, 200, {
    "Set-Cookie": sessionCookie(request, result.sessionToken, result.sessionExpires),
  });
}
