import { shipPublicInfo } from "@/lib/db/rpc";
import { serverEnv } from "@/lib/env";

/**
 * GET /api/ship: public ship details for the landing page (name, whether
 * boarding is open, passengers aboard). Cached at the CDN for 30 s so a busy
 * landing page doesn't hit the database on every view.
 */
export async function GET() {
  const info = await shipPublicInfo(serverEnv().SHIP_ID);
  if (!info) return Response.json({ error: "NOT_FOUND" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return Response.json(
    { name: info.name, boardingOpen: info.boarding_open, passengers: info.passengers },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" } },
  );
}
