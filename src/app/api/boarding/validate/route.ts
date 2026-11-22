import { z } from "zod";
import { validateCode } from "@/lib/boarding/service";
import { ipKey, isSameOrigin, json, readJson } from "@/lib/http/request";
import { secrets } from "@/lib/env";
import { boardingErrorResponse } from "@/lib/boarding/responses";

const Body = z.object({ code: z.string().max(64) }).strict();

/** POST /api/boarding/validate: is this code redeemable? Never consumes it. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "FORBIDDEN" }, 403);
  const body = Body.safeParse(await readJson(request));
  if (!body.success) return json({ error: "BAD_REQUEST" }, 400);

  const result = await validateCode(body.data.code, await ipKey(request, secrets().pepper));
  return result.ok ? json({ ok: true }) : boardingErrorResponse(result.error);
}
