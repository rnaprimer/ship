import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_HEADER, accessConfigFromEnv, verifyAccessToken } from "@/lib/admin/access";

/**
 * Gate for /admin: only requests carrying a valid Cloudflare Access token for
 * an allowed admin get through. Everything else is a plain 404. Pages and
 * server actions check again (defense in depth).
 */
export async function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === "development" && process.env.ADMIN_DEV_EMAIL) return NextResponse.next();
  const admin = await verifyAccessToken(request.headers.get(ACCESS_HEADER), accessConfigFromEnv());
  if (!admin) return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
